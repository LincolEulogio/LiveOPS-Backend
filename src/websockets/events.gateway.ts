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
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { IntercomService } from '../intercom/intercom.service';
import { ChatService } from '../chat/chat.service';
import { ScriptService } from '../script/script.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');
  private activeUsers: Map<
    string,
    {
      userId: string;
      userName: string;
      roleId: string;
      roleName: string;
      lastSeen: string;
      status: string;
    }
  > = new Map();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private intercomService: IntercomService,
    private chatService: ChatService,
    private scriptService: ScriptService,
  ) { }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  @SubscribeMessage('chat.send')
  async handleChatSend(
    @MessageBody()
    data: { productionId: string; userId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.chatService.saveMessage(
      data.productionId,
      data.userId,
      data.message,
    );

    // Broadcast to the production room
    this.server
      .to(`production_${data.productionId}`)
      .emit('chat.received', message);

    return { status: 'ok', messageId: message.id };
  }

  @SubscribeMessage('production.join')
  async handleProductionJoin(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} joining room production_${data.productionId}`);
    client.join(`production_${data.productionId}`);
    client.data.productionId = data.productionId;

    // Broadcast presence immediately to everyone in the room
    this.broadcastPresence(data.productionId);

    return { status: 'joined', room: `production_${data.productionId}` };
  }

  @SubscribeMessage('production.leave')
  async handleProductionLeave(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} leaving room production_${data.productionId}`);
    client.leave(`production_${data.productionId}`);

    // Broadcast updated presence to the room they left
    this.broadcastPresence(data.productionId);

    return { status: 'left', room: `production_${data.productionId}` };
  }

  @SubscribeMessage('script.typing')
  handleChatTyping(
    @MessageBody()
    data: {
      productionId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`production_${data.productionId}`).emit('chat.typing', data);
  }

  @SubscribeMessage('script.sync')
  async handleScriptSync(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const script = await this.scriptService.getScriptState(data.productionId);
    client.emit('script.sync_response', { content: script?.content || null });
  }

  @SubscribeMessage('script.update')
  async handleScriptUpdate(
    @MessageBody() data: { productionId: string; update: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const updateArray = new Uint8Array(data.update);

    // Broadcast update to others in the room immediately
    client
      .to(`production_${data.productionId}`)
      .emit('script.update_received', { update: updateArray });

    // Persist to DB
    // In a high-traffic production, we'd throttle this or use a Yjs provider on the server
    // For now, we'll save it to ensure consistency on refresh
    await this.scriptService.updateScriptState(
      data.productionId,
      Buffer.from(updateArray),
    );
  }

  @SubscribeMessage('script.awareness_update')
  handleAwarenessUpdate(
    @MessageBody() data: { productionId: string; update: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast awareness state (cursors, selections) to others
    client
      .to(`production_${data.productionId}`)
      .emit('script.awareness_received', {
        update: data.update,
      });
  }

  @SubscribeMessage('webrtc.signal')
  handleWebRTCSignal(
    @MessageBody()
    data: {
      productionId: string;
      targetUserId: string;
      signal: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderUserId = client.handshake.query.userId as string;

    this.logger.debug(`WebRTC Signal from ${senderUserId} to ${data.targetUserId} in production ${data.productionId}`);

    // Forward the signal to the specific target user within the production room
    // Note: We search among connected sockets in the room for the targetUserId
    const room = `production_${data.productionId}`;
    const socketsInRoom = this.server.sockets.adapter.rooms.get(room);

    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket && socket.handshake.query.userId === data.targetUserId) {
          socket.emit('webrtc.signal_received', {
            senderUserId,
            signal: data.signal
          });
          break;
        }
      }
    }
  }

  @SubscribeMessage('social.overlay')
  handleSocialOverlay(
    @MessageBody()
    data: {
      productionId: string;
      comment: any | null;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.server
      .to(`production_${data.productionId}`)
      .emit('social.overlay_update', { comment: data.comment });
  }

  @SubscribeMessage('script.scroll_sync')
  handleScriptScrollSync(
    @MessageBody() data: { productionId: string; scrollPercentage: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast scroll position to others (talent/prompter)
    client
      .to(`production_${data.productionId}`)
      .emit('script.scroll_received', {
        scrollPercentage: data.scrollPercentage,
      });
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const productionId = client.handshake.query.productionId as string;
    const userId = client.handshake.query.userId as string;
    const userName = client.handshake.query.userName as string;
    const roleId = client.handshake.query.roleId as string;
    const roleName = client.handshake.query.roleName as string;

    if (productionId && userId) {
      client.join(`production_${productionId}`);

      this.activeUsers.set(client.id, {
        userId,
        userName: userName || 'User',
        roleId: roleId || '',
        roleName: roleName || 'Viewer',
        lastSeen: new Date().toISOString(),
        status: 'IDLE',
      });

      client.data.productionId = productionId;
      this.logger.log(
        `User ${userId} (${roleName}) joined production_${productionId}`,
      );

      this.broadcastPresence(productionId);
    }
  }

  private broadcastPresence(productionId: string) {
    const room = `production_${productionId}`;
    const socketIds = this.server.sockets.adapter.rooms.get(room);
    const uniqueMembers = new Map<string, any>();

    if (socketIds) {
      for (const socketId of socketIds) {
        const data = this.activeUsers.get(socketId);
        if (data && data.userId) {
          // Use userId as key to ensure uniqueness
          uniqueMembers.set(data.userId, data);
        }
      }
    }

    const members = Array.from(uniqueMembers.values());
    this.server.to(room).emit('presence.update', { members });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const productionId = client.data.productionId;

    this.activeUsers.delete(client.id);

    if (productionId) {
      this.broadcastPresence(productionId);
    }
  }

  @SubscribeMessage('user.identify')
  handleUserIdentify(
    @MessageBody() data: { userId: string; userName: string; roleId: string; roleName: string; productionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.activeUsers.set(client.id, {
      userId: data.userId,
      userName: data.userName || 'User',
      roleId: data.roleId || '',
      roleName: data.roleName || 'Viewer',
      lastSeen: new Date().toISOString(),
      status: 'IDLE',
    });

    if (data.productionId) {
      client.join(`production_${data.productionId}`);
      client.data.productionId = data.productionId;
      this.broadcastPresence(data.productionId);
    }

    return { status: 'ok' };
  }

  @SubscribeMessage('role.identify')
  handleRoleIdentify(
    @MessageBody() data: { roleId: string; roleName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const currentUser = this.activeUsers.get(client.id);
    if (currentUser) {
      this.activeUsers.set(client.id, {
        ...currentUser,
        roleId: data.roleId,
        roleName: data.roleName,
      });
      const productionId = client.data.productionId;
      if (productionId) {
        this.broadcastPresence(productionId);
      }
    }
    return { status: 'ok', role: data.roleName };
  }

  @SubscribeMessage('command.send')
  async handleCommandSend(
    @MessageBody()
    data: {
      productionId: string;
      senderId: string;
      targetUserId?: string;
      targetRoleId?: string;
      templateId?: string;
      message: string;
      requiresAck?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`[Intercom] Sending command from ${data.senderId} to production ${data.productionId}`, data);
    // Save to DB via service
    const command = await this.intercomService.sendCommand(data);

    // Update presence status for relevant users
    for (const [sid, user] of this.activeUsers.entries()) {
      const isTargeted =
        (data.targetUserId && user.userId === data.targetUserId) ||
        (!data.targetUserId &&
          (user.roleId === data.targetRoleId || !data.targetRoleId));

      if (isTargeted) {
        this.activeUsers.set(sid, { ...user, status: data.message });
      }
    }
    this.broadcastPresence(data.productionId);

    return { status: 'ok', commandId: command.id };
  }

  @SubscribeMessage('command.ack')
  async handleCommandAck(
    @MessageBody()
    data: {
      commandId: string;
      responderId: string;
      response: string;
      note?: string;
      productionId: string;
      responseType?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`[Intercom] Received Ack from ${data.responderId} for command ${data.commandId}`);
    // Save response to DB
    const response = await this.prisma.commandResponse.create({
      data: {
        commandId: data.commandId,
        responderId: data.responderId,
        response: data.response,
        note: data.note,
      },
      include: {
        responder: { select: { id: true, name: true } },
      },
    });

    // Broadcast ACK back to sender / room
    const room = `production_${data.productionId}`;
    // Update status to ACKNOWLEDGED for the specific responder
    const user = this.activeUsers.get(client.id);
    if (user) {
      this.activeUsers.set(client.id, {
        ...user,
        status: `OK: ${data.responseType}`,
      });
      const productionId = client.data.productionId;
      if (productionId) this.broadcastPresence(productionId);
    }

    this.server.to(room).emit('command.ack_received', response);

    return { status: 'ok', responseId: response.id };
  }

  // --- Internal Events Handlers (Forwarding to WS) ---

  @OnEvent('obs.scene.changed')
  async handleObsSceneChanged(payload: {
    productionId: string;
    sceneName: string;
    cpuUsage?: number;
    fps?: number;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('obs.scene.changed', {
        sceneName: payload.sceneName,
        cpuUsage: payload.cpuUsage,
        fps: payload.fps,
      });

    // SYSTEM LOG IN CHAT
    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      `🎬 Escena cambiada a: ${payload.sceneName}`,
    );
    this.server
      .to(`production_${payload.productionId}`)
      .emit('chat.received', msg);
  }

  @OnEvent('obs.stream.state')
  async handleObsStreamState(payload: {
    productionId: string;
    active: boolean;
    state: string;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('obs.stream.state', payload);

    // SYSTEM LOG IN CHAT
    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      payload.active
        ? `🔴 EMISIÓN INICIADA (${payload.state})`
        : `⚪ EMISIÓN DETENIDA (${payload.state})`,
    );
    this.server
      .to(`production_${payload.productionId}`)
      .emit('chat.received', msg);
  }

  @OnEvent('obs.record.state')
  async handleObsRecordState(payload: {
    productionId: string;
    active: boolean;
    state: string;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('obs.record.state', payload);

    // SYSTEM LOG IN CHAT
    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      payload.active
        ? `⏺️ GRABACIÓN INICIADA (${payload.state})`
        : `⏹️ GRABACIÓN DETENIDA (${payload.state})`,
    );
    this.server
      .to(`production_${payload.productionId}`)
      .emit('chat.received', msg);
  }

  @OnEvent('obs.connection.state')
  async handleObsConnectionState(payload: {
    productionId: string;
    connected: boolean;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('obs.connection.state', payload);

    // SYSTEM LOG IN CHAT
    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      payload.connected ? `🔗 OBS CONECTADO` : `❌ OBS DESCONECTADO`,
    );
    this.server
      .to(`production_${payload.productionId}`)
      .emit('chat.received', msg);
  }

  @OnEvent('vmix.input.changed')
  handleVmixInputChanged(payload: {
    productionId: string;
    activeInput: number;
    previewInput: number;
    isStreaming?: boolean;
    isRecording?: boolean;
    isExternal?: boolean;
    isMultiCorder?: boolean;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('vmix.input.changed', payload);
  }

  @OnEvent('vmix.connection.state')
  handleVmixConnectionState(payload: {
    productionId: string;
    connected: boolean;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('vmix.connection.state', payload);
  }

  @OnEvent('timeline.updated')
  handleTimelineUpdated(payload: { productionId: string }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('timeline.updated', payload);
  }

  @OnEvent('command.created')
  handleCommandCreated(payload: { productionId: string; command: any }) {
    this.logger.log(
      `Broadcasting new command for production ${payload.productionId}`,
    );
    this.server
      .to(`production_${payload.productionId}`)
      .emit('command.received', payload.command);
  }

  @OnEvent('production.health.stats')
  handleProductionHealthStats(payload: any) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('production.health.stats', payload);
  }

  @OnEvent('social.overlay_update')
  handleSocialOverlayUpdate(payload: {
    productionId: string;
    comment: any | null;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('social.overlay_update', payload);
  }
}
