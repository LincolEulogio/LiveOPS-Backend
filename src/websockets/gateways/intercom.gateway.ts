import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { IntercomService } from '@/intercom/intercom.service';
import { PresenceService } from '@/websockets/presence.service';
import { WsAuthGuard } from '@/websockets/guards/ws-auth.guard';
import type { AuthenticatedSocket, IntercomCommandPayload } from '@/websockets/types/socket.types';

const RATE_LIMIT_MS = 1_000;

@WebSocketGateway()
@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class IntercomGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IntercomGateway.name);
  // In-memory rate limit map: userId → last command timestamp (ms).
  // Resets on restart — acceptable; prevents burst spam per session.
  private readonly commandRateMap = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly intercomService: IntercomService,
    private readonly presenceService: PresenceService,
  ) {}

  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const last = this.commandRateMap.get(userId) ?? 0;
    if (now - last < RATE_LIMIT_MS) return true;
    this.commandRateMap.set(userId, now);
    return false;
  }

  @SubscribeMessage('command.broadcast')
  async handleCommandBroadcast(
    @MessageBody()
    data: {
      productionId: string;
      message: string;
      priority?: string;
      requiresAck?: boolean;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const senderId = client.data.userId;

    if (this.isRateLimited(senderId)) {
      client.emit('command.error', { message: 'Demasiados comandos. Espera un momento.' });
      return { status: 'rate_limited' };
    }

    this.logger.log(`[Intercom] Broadcast from ${senderId} → production ${data.productionId} [${data.priority || 'NORMAL'}]`);
    const command = await this.intercomService.sendCommand({
      ...data,
      senderId,
      isBroadcast: true,
    });

    this.presenceService.broadcastToProduction(data.productionId);
    return { status: 'ok', commandId: command.id };
  }

  @SubscribeMessage('command.send')
  async handleCommandSend(
    @MessageBody()
    data: {
      productionId: string;
      targetUserId?: string;
      targetRoleId?: string;
      templateId?: string;
      message: string;
      priority?: string;
      requiresAck?: boolean;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const senderId = client.data.userId;

    if (this.isRateLimited(senderId)) {
      client.emit('command.error', { message: 'Demasiados comandos. Espera un momento.' });
      return { status: 'rate_limited' };
    }

    this.logger.log(`[Intercom] Command from ${senderId} → production ${data.productionId} [${data.priority || 'NORMAL'}]`);
    const command = await this.intercomService.sendCommand({ ...data, senderId });

    const room = `production_${data.productionId}`;
    const socketsInRoom = this.server.sockets.adapter.rooms.get(room);
    if (socketsInRoom) {
      for (const sid of socketsInRoom) {
        const socket = this.server.sockets.sockets.get(sid);
        if (socket) {
          const uId = socket.handshake.query.userId as string;
          const rId = socket.handshake.query.roleId as string;
          const isTargeted =
            (data.targetUserId && uId === data.targetUserId) ||
            (!data.targetUserId && (rId === data.targetRoleId || !data.targetRoleId));
          if (isTargeted) {
            this.presenceService.updateStatus(sid, data.message);
          }
        }
      }
    }

    this.presenceService.broadcastToProduction(data.productionId);
    return { status: 'ok', commandId: command.id };
  }

  @SubscribeMessage('command.group_send')
  async handleCommandGroupSend(
    @MessageBody()
    data: {
      productionId: string;
      targetUserIds: string[];
      templateId?: string;
      message: string;
      priority?: string;
      requiresAck?: boolean;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const senderId = client.data.userId;

    if (this.isRateLimited(senderId)) {
      client.emit('command.error', { message: 'Demasiados comandos. Espera un momento.' });
      return { status: 'rate_limited' };
    }

    const commands = await Promise.all(
      data.targetUserIds.map((targetUserId) =>
        this.intercomService.sendCommand({
          productionId: data.productionId,
          senderId,
          targetUserId,
          templateId: data.templateId,
          message: data.message,
          priority: data.priority,
          requiresAck: data.requiresAck,
        }),
      ),
    );

    this.presenceService.broadcastToProduction(data.productionId);
    return { status: 'ok', commandIds: commands.map((c) => c.id) };
  }

  @SubscribeMessage('command.delivered')
  async handleCommandDelivered(
    @MessageBody() data: { commandId: string; productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    try {
      await this.prisma.command.updateMany({
        where: { id: data.commandId, status: 'SENT' },
        data: { status: 'DELIVERED' },
      });
    } catch {
      // Command may not exist — ignore
    }

    this.server.to(`production_${data.productionId}`).emit('command.delivered_ack', {
      commandId: data.commandId,
      deliveredBy: client.data.userId,
      deliveredAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('command.ack')
  async handleCommandAck(
    @MessageBody()
    data: {
      commandId: string;
      response: string;
      note?: string;
      productionId: string;
      responseType?: string;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const responderId = client.data.userId;
    this.logger.log(`[Intercom] Ack from ${responderId} for command ${data.commandId}`);

    const response = await this.prisma.commandResponse.create({
      data: {
        commandId: data.commandId,
        responderId,
        response: data.response,
        note: data.note,
      },
      include: { responder: { select: { id: true, name: true } } },
    });

    this.presenceService.updateStatus(client.id, `ACK:${data.responseType}`);
    if (data.productionId) this.presenceService.broadcastToProduction(data.productionId);

    this.server.to(`production_${data.productionId}`).emit('command.ack_received', {
      ...response,
      responseType: data.responseType || response.response,
      productionId: data.productionId,
    });

    return { status: 'ok', responseId: response.id };
  }

  @SubscribeMessage('crew.status_update')
  handleCrewStatusUpdate(
    @MessageBody() data: { productionId: string; status: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.presenceService.updateStatus(client.id, data.status);
    this.presenceService.broadcastToProduction(data.productionId);
    return { status: 'ok' };
  }

  @OnEvent('command.created')
  handleCommandCreated(payload: { productionId: string; command: IntercomCommandPayload }): void {
    this.logger.log(`Broadcasting new command for production ${payload.productionId}`);
    this.server.to(`production_${payload.productionId}`).emit('command.received', payload.command);
  }
}
