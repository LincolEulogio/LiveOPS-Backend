import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PresenceService } from '@/websockets/presence.service';
import { WsAuthGuard } from '@/websockets/guards/ws-auth.guard';
import type { AuthenticatedSocket } from '@/websockets/types/socket.types';

const GATEWAY_CORS = {
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
  credentials: true,
};

interface BaseEventPayload {
  productionId: string;
}

@WebSocketGateway({
  cors: GATEWAY_CORS,
  pingInterval: 10000,  // server pings client every 10s
  pingTimeout: 20000,   // disconnect if no pong within 20s
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CoreGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CoreGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly presenceService: PresenceService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(): void {
    this.presenceService.setServer(this.server);
    this.setupRedisAdapter();
    this.startPresenceCleanup();
    this.registerPassthroughEvents();
    this.logger.log('CoreGateway initialized');
  }

  private setupRedisAdapter(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) return;

    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) =>
      this.logger.error(
        'Redis pub error',
        err instanceof Error ? err.message : String(err),
      ),
    );
    subClient.on('error', (err) =>
      this.logger.error(
        'Redis sub error',
        err instanceof Error ? err.message : String(err),
      ),
    );

    this.server.adapter(createAdapter(pubClient, subClient));
    this.logger.log('Socket.IO Redis adapter configured');
  }

  private registerPassthroughEvents(): void {
    const passthrough: string[] = [
      'obs.screenshot.update',
      'obs.scene.thumbnails',
      'obs.audio.volume',
      'obs.audio.mute',
      'vmix.connection.state',
      'timeline.updated',
      'production.health.stats',
      'social.overlay_update',
      'social.message.new',
      'social.message.updated',
      'social.poll.created',
      'social.poll.updated',
      'social.poll.closed',
      'graphics.social.show',
      'graphics.social.hide',
      'overlay.list_updated',
      'production.updated',
      'production.state_updated',
      'guest.slots.updated',
      'guest.returnfeed.updated',
      'guest.ifb.received',
      'social.viewers_update',
      'analytics.log',
      'stream.health.alert',
      'overlay.update_data',
    ];

    for (const event of passthrough) {
      this.eventEmitter.on(event, (payload: BaseEventPayload & { tenantId?: string }) => {
        if (payload?.productionId) {
          // Scoped to production room — only users in that production receive this
          this.server.to(`production_${payload.productionId}`).emit(event, payload);
        } else if (payload?.tenantId) {
          // Tenant-scoped broadcast — never cross-tenant
          this.server.to(`tenant_${payload.tenantId}`).emit(event, payload);
        }
        // Global broadcast removed — no cross-tenant leakage
      });
    }
  }

  private startPresenceCleanup(): void {
    setInterval(() => {
      const inactiveSocketIds = this.presenceService.getInactiveSockets(60_000);
      if (inactiveSocketIds.length === 0) return;

      inactiveSocketIds.forEach((sid) => {
        this.presenceService.updateStatus(sid, 'OFFLINE');
        this.logger.warn(`Client ${sid} marked OFFLINE due to inactivity`);
      });

      for (const pid of this.presenceService.getProductionsWithActiveUsers()) {
        this.presenceService.broadcastToProduction(pid);
      }
    }, 30_000);
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const rawToken =
      (client.handshake.auth as Record<string, string>)?.token ??
      client.handshake.headers?.authorization?.replace('Bearer ', '').trim() ??
      (client.handshake.query?.token as string);

    if (!rawToken) {
      this.logger.warn(`WS rejected — no token: ${client.id}`);
      client.emit('error', { message: 'Unauthorized: token required' });
      client.disconnect(true);
      return;
    }

    let jwtPayload: { sub: string; tenantId?: string };
    try {
      jwtPayload = this.jwtService.verify<{ sub: string; tenantId?: string }>(
        rawToken,
        {
          secret:
            this.configService.get<string>('JWT_SECRET') ?? 'super-secret',
        },
      );
    } catch {
      this.logger.warn(`WS rejected — invalid token: ${client.id}`);
      client.emit('error', { message: 'Unauthorized: invalid token' });
      client.disconnect(true);
      return;
    }

    const verifiedUserId = jwtPayload.sub;
    client.data.userId = verifiedUserId;

    const productionId = client.handshake.query.productionId as
      | string
      | undefined;
    const userName = client.handshake.query.userName as string | undefined;
    const roleId = client.handshake.query.roleId as string | undefined;
    const roleName = client.handshake.query.roleName as string | undefined;

    const tenantId = jwtPayload.tenantId;

    // Always join the tenant room so tenant-scoped broadcasts work
    if (tenantId) {
      await client.join(`tenant_${tenantId}`);
      client.data.tenantId = tenantId;
    }

    if (productionId) {
      // Verify the production belongs to the user's tenant before joining the room
      const production = await this.prisma.production.findUnique({
        where: { id: productionId },
        select: { tenantId: true, activeState: true },
      });

      if (!production) {
        client.emit('error', { message: 'Production not found' });
        client.disconnect(true);
        return;
      }

      if (tenantId && production.tenantId !== tenantId) {
        this.logger.warn(
          `User ${verifiedUserId} (tenant ${tenantId}) attempted to join production from tenant ${production.tenantId}`,
        );
        client.emit('error', { message: 'Unauthorized: production belongs to a different tenant' });
        client.disconnect(true);
        return;
      }

      await client.join(`production_${productionId}`);
      client.data.productionId = productionId;

      this.presenceService.upsertPresence(
        client.id,
        {
          userId: verifiedUserId,
          userName: userName ?? 'User',
          roleId: roleId ?? '',
          roleName: roleName ?? 'Viewer',
          lastSeen: new Date().toISOString(),
          status: 'IDLE',
        },
        productionId,
      );

      this.logger.log(
        `User ${verifiedUserId} (${roleName ?? 'Viewer'}) joined production_${productionId}`,
      );
      this.presenceService.broadcastToProduction(productionId);

      // Rehydrate state on connect so reconnecting clients recover immediately
      client.emit('reconnect.rehydrate', {
        productionId,
        state: production.activeState ?? {},
        serverTime: new Date().toISOString(),
      });
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    const productionId = client.data.productionId;
    this.presenceService.removePresence(client.id);
    if (productionId) {
      this.presenceService.broadcastToProduction(productionId);
    }
  }

  // ─── Message Handlers ───────────────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('production.join')
  async handleProductionJoin(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const production = await this.prisma.production.findUnique({
      where: { id: data.productionId },
      select: { tenantId: true, activeState: true },
    });

    if (!production) return { error: 'Production not found' };

    const clientTenantId = client.data.tenantId as string | undefined;
    if (clientTenantId && production.tenantId !== clientTenantId) {
      this.logger.warn(
        `User ${client.data.userId} attempted cross-tenant production join: ${data.productionId}`,
      );
      return { error: 'Unauthorized: cross-tenant access denied' };
    }

    await client.join(`production_${data.productionId}`);
    client.data.productionId = data.productionId;
    this.presenceService.associateWithProduction(client.id, data.productionId);
    this.presenceService.broadcastToProduction(data.productionId);

    // Rehydrate for this late-join / re-join
    client.emit('reconnect.rehydrate', {
      productionId: data.productionId,
      state: production.activeState ?? {},
      serverTime: new Date().toISOString(),
    });

    return { status: 'joined', room: `production_${data.productionId}` };
  }

  /** Round-trip latency probe — client sends client.ping, we echo back client.pong. */
  @SubscribeMessage('client.ping')
  handleClientPing(
    @MessageBody() data: { t: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.emit('client.pong', { t: data.t });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('production.leave')
  async handleProductionLeave(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    await client.leave(`production_${data.productionId}`);
    this.presenceService.broadcastToProduction(data.productionId);
    return { status: 'left', room: `production_${data.productionId}` };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('user.identify')
  async handleUserIdentify(
    @MessageBody()
    data: {
      userName: string;
      roleId: string;
      roleName: string;
      productionId: string;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.presenceService.upsertPresence(
      client.id,
      {
        userId: client.data.userId,
        userName: data.userName || 'User',
        roleId: data.roleId || '',
        roleName: data.roleName || 'Viewer',
        lastSeen: new Date().toISOString(),
        status: 'IDLE',
      },
      data.productionId,
    );

    if (data.productionId) {
      await client.join(`production_${data.productionId}`);
      client.data.productionId = data.productionId;
      this.presenceService.broadcastToProduction(data.productionId);
    }
    return { status: 'ok' };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('user.heartbeat')
  handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket): void {
    this.presenceService.heartbeat(client.id);
  }

  @SubscribeMessage('time.sync')
  handleTimeSync() {
    return { serverTime: new Date().toISOString() };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('production.state_update_broadcast')
  handleProductionStateBroadcast(
    @MessageBody() data: { productionId: string; state: unknown },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client
      .to(`production_${data.productionId}`)
      .emit('production.state_updated', {
        productionId: data.productionId,
        state: data.state,
      });
    return { status: 'ok' };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('production.state_update_persist')
  async handleProductionStatePersist(
    @MessageBody() data: { productionId: string; state: unknown },
  ) {
    await this.prisma.production.update({
      where: { id: data.productionId },
      data: { activeState: data.state as Prisma.InputJsonValue },
    });
    return { status: 'ok' };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('production.state_sync')
  async handleProductionStateSync(
    @MessageBody() data: { productionId: string },
  ) {
    const production = await this.prisma.production.findUnique({
      where: { id: data.productionId },
      select: { activeState: true },
    });
    return { state: (production?.activeState as unknown) || {} };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('hardware.trigger')
  handleHardwareTrigger(
    @MessageBody() data: { productionId: string; mapKey: string },
  ): void {
    this.logger.debug(`Hardware trigger: ${data.mapKey}`);
    this.eventEmitter.emit('hardware.trigger', data);
  }

  // ─── NDI Bridge ─────────────────────────────────────────────────────────────

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ndi.identify_bridge')
  handleIdentifyBridge(
    @MessageBody() data: { bridgeName: string; productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    client.data.isNdiBridge = true;
    client.data.bridgeName = data.bridgeName;
    client.data.productionId = data.productionId;
    void client.join(`production_${data.productionId}`);
    this.logger.log(
      `NDI Bridge "${data.bridgeName}" identified for production ${data.productionId}`,
    );
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.bridge_status', {
        bridgeName: data.bridgeName,
        status: 'ONLINE',
      });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ndi.bridge_register')
  async handleNdiBridgeRegister(
    @MessageBody() data: { productionId: string; bridgeName: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    this.logger.log(
      `NDI Bridge ${data.bridgeName} registered for production ${data.productionId}`,
    );
    await client.join(`production_${data.productionId}`);
    client.data.isNdiBridge = true;
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.bridge_status', {
        bridgeName: data.bridgeName,
        status: 'ONLINE',
      });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ndi.sources_update')
  handleNdiSourcesUpdate(
    @MessageBody()
    data: {
      productionId: string;
      sources: Record<string, unknown>[];
    },
  ): void {
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.sources_received', {
        productionId: data.productionId,
        sources: data.sources,
      });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('ndi.request_sync')
  handleNdiRequestSync(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    this.server.to(`production_${data.productionId}`).emit('ndi.sync_request', {
      requesterId: client.id,
    });
  }

  // ─── Internal Event: DeviceSession handling ──────────────────────────────────

  @OnEvent('production.user.assigned')
  handleUserAssigned(payload: { productionId: string }): void {
    this.presenceService.broadcastToProduction(payload.productionId);
  }
}
