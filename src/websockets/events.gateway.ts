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
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface CustomSocket extends Socket {
  data: {
    productionId?: string;
    isNdiBridge?: boolean;
    [key: string]: unknown;
  };
}

import { Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { IntercomService } from '@/intercom/intercom.service';
import { ChatService } from '@/chat/chat.service';
import { ScriptService } from '@/script/script.service';
import { PresenceService } from '@/websockets/presence.service';
import { SocketEvents } from '@/common/socket-events';
import type { WebRTCSignalPayload } from '@/common/types/webrtc.types';

interface SocialComment {
  id: string;
  author: string;
  content: string;
  platform: string;
  avatarUrl?: string;
  timestamp: string;
}

interface IntercomCommand {
  id: string;
  productionId: string;
  senderId: string;
  targetUserId?: string;
  targetRoleId?: string;
  templateId?: string;
  message: string;
  requiresAck?: boolean;
  createdAt: string;
  status?: string;
  sender?: { id: string; name: string };
}

interface HealthStatsPayload {
  productionId: string;
  cpuUsage: number;
  memoryUsage: number;
  bitrate: number;
  fps: number;
  skippedFrames: number;
  timestamp: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');
  private scriptUpdateTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private intercomService: IntercomService,
    private chatService: ChatService,
    private scriptService: ScriptService,
    private presenceService: PresenceService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
    this.startPresenceCleanup();
  }

  @SubscribeMessage('chat.send')
  async handleChatSend(
    @MessageBody()
    data: { productionId: string; userId: string; message: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    this.logger.log(
      `Chat sent in production: ${data.productionId} by user: ${data.userId}`,
    );

    // 1. Check for slash commands
    if (data.message.startsWith('/')) {
      const parts = data.message.split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (command === '/alert' && args.trim()) {
        // Trigger a mass alarm via intercom service
        const intercomCommand = await this.intercomService.sendCommand({
          productionId: data.productionId,
          senderId: data.userId,
          message: args,
          requiresAck: true,
        });

        // Notify the user who sent the command
        client.emit('chat.received', {
          id: `sys-${Date.now()}`,
          productionId: data.productionId,
          userId: null,
          message: `🚀 Comando ejecutado: Alerta enviada a todo el equipo.`,
          createdAt: new Date().toISOString(),
        });

        return { status: 'command_executed', commandId: intercomCommand.id };
      }
    }

    // 2. Normal Chat Message
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

  @SubscribeMessage(SocketEvents.TIME_SYNC)
  handleTimeSync() {
    return { serverTime: new Date().toISOString() };
  }

  @SubscribeMessage(SocketEvents.PRODUCTION_JOIN)
  async handleProductionJoin(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    this.logger.log(
      `Client ${client.id} joining room production_${data.productionId}`,
    );
    await client.join(`production_${data.productionId}`);
    client.data.productionId = data.productionId;

    this.presenceService.associateWithProduction(client.id, data.productionId);

    // Broadcast presence immediately to everyone in the room
    this.broadcastPresence(data.productionId);

    return { status: 'joined', room: `production_${data.productionId}` };
  }

  @SubscribeMessage('production.leave')
  async handleProductionLeave(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    this.logger.log(
      `Client ${client.id} leaving room production_${data.productionId}`,
    );
    await client.leave(`production_${data.productionId}`);

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
    @ConnectedSocket() client: CustomSocket,
  ) {
    client.to(`production_${data.productionId}`).emit('chat.typing', data);
  }

  @SubscribeMessage('script.sync')
  async handleScriptSync(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    const script = await this.scriptService.getScriptState(data.productionId);
    client.emit('script.sync_response', { content: script?.content || null });
  }

  @SubscribeMessage('script.update')
  handleScriptUpdate(
    @MessageBody() data: { productionId: string; update: number[] },
    @ConnectedSocket() client: CustomSocket,
  ) {
    const updateArray = new Uint8Array(data.update);

    // Broadcast update to others in the room immediately
    client
      .to(`production_${data.productionId}`)
      .emit('script.update_received', { update: updateArray });

    // Persist to DB with throttling
    if (this.scriptUpdateTimers.has(data.productionId)) {
      clearTimeout(this.scriptUpdateTimers.get(data.productionId));
    }

    const timer = setTimeout(() => {
      this.scriptUpdateTimers.delete(data.productionId);
      this.scriptService
        .updateScriptState(data.productionId, Buffer.from(updateArray))
        .catch((err) => {
          this.logger.error('Failed to persist script update', err);
        });
    }, 1000); // 1s throttle for DB writes

    this.scriptUpdateTimers.set(data.productionId, timer);
  }

  @SubscribeMessage('script.awareness_update')
  handleAwarenessUpdate(
    @MessageBody() data: { productionId: string; update: number[] },
    @ConnectedSocket() client: CustomSocket,
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
    data: WebRTCSignalPayload,
    @ConnectedSocket() client: CustomSocket,
  ) {
    const senderUserId = client.handshake.query.userId as string;
    this.logger.debug(
      `WebRTC Signal from ${senderUserId} to ${data.targetUserId} in production ${data.productionId}`,
    );

    // Forward the signal to EVERY socket of the target user
    const targetSocketIds = this.presenceService.getSocketIdsForUser(
      data.targetUserId,
    );

    for (const socketId of targetSocketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('webrtc.signal_received', {
          senderUserId,
          signal: data.signal,
          context: data.context,
        });
      }
    }
  }

  @SubscribeMessage('webrtc.talking')
  handleWebRTCTalking(
    @MessageBody()
    data: {
      productionId: string;
      isTalking: boolean;
      targetUserId?: string | null;
    },
  ) {
    const room = `production_${data.productionId}`;

    // Broadcast to the whole room so dashboard and other clients can update state instantly
    this.server.to(room).emit('webrtc.talking', {
      senderUserId: data.targetUserId,
      isTalking: data.isTalking,
      targetUserId: data.targetUserId || null,
    });
  }

  @SubscribeMessage(SocketEvents.WEBRTC_AUDIO_LEVEL)
  handleWebRTCAudioLevel(
    @MessageBody()
    data: { productionId: string; level: number },
    @ConnectedSocket() client: CustomSocket,
  ) {
    const senderUserId = client.handshake.query.userId as string;
    // Broadcast to room so others can see VU meters
    client
      .to(`production_${data.productionId}`)
      .emit(SocketEvents.WEBRTC_AUDIO_LEVEL_RECEIVED, {
        senderUserId,
        level: data.level,
      });
  }

  @SubscribeMessage('social.overlay')
  handleSocialOverlay(
    @MessageBody()
    data: {
      productionId: string;
      comment: SocialComment | null;
    },
  ) {
    this.server
      .to(`production_${data.productionId}`)
      .emit('social.overlay_update', { comment: data.comment });
  }

  @SubscribeMessage('script.scroll_sync')
  handleScriptScrollSync(
    @MessageBody() data: { productionId: string; scrollPercentage: number },
    @ConnectedSocket() client: CustomSocket,
  ) {
    // Broadcast scroll position to others (talent/prompter)
    client
      .to(`production_${data.productionId}`)
      .emit('script.scroll_received', {
        scrollPercentage: data.scrollPercentage,
      });
  }

  @SubscribeMessage('hardware.trigger')
  handleHardwareTrigger(
    @MessageBody() data: { productionId: string; mapKey: string },
  ) {
    this.logger.debug(`Hardware trigger socket received: ${data.mapKey}`);
    this.eventEmitter.emit('hardware.trigger', data);
  }

  async handleConnection(client: CustomSocket) {
    const productionId = client.handshake.query.productionId as string;
    const userId = client.handshake.query.userId as string;
    const userName = client.handshake.query.userName as string;
    const roleId = client.handshake.query.roleId as string;
    const roleName = client.handshake.query.roleName as string;

    if (productionId && userId) {
      await client.join(`production_${productionId}`);

      this.presenceService.upsertPresence(
        client.id,
        {
          userId,
          userName: userName || 'User',
          roleId: roleId || '',
          roleName: roleName || 'Viewer',
          lastSeen: new Date().toISOString(),
          status: 'IDLE',
        },
        productionId,
      );

      client.data.productionId = productionId;
      this.logger.log(
        `User ${userId} (${roleName}) joined production_${productionId}`,
      );

      this.broadcastPresence(productionId);
    }
  }

  private broadcastPresence(productionId: string) {
    const members = this.presenceService.getPresenceForProduction(productionId);
    this.server
      .to(`production_${productionId}`)
      .emit('presence.update', { members });
  }

  handleDisconnect(client: CustomSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const productionId = client.data.productionId;

    this.presenceService.removePresence(client.id);

    if (productionId) {
      this.broadcastPresence(productionId);
    }
  }

  @SubscribeMessage('user.identify')
  async handleUserIdentify(
    @MessageBody()
    data: {
      userId: string;
      userName: string;
      roleId: string;
      roleName: string;
      productionId: string;
    },
    @ConnectedSocket() client: CustomSocket,
  ) {
    this.presenceService.upsertPresence(
      client.id,
      {
        userId: data.userId,
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
      this.broadcastPresence(data.productionId);
    }

    return { status: 'ok' };
  }

  @SubscribeMessage('user.heartbeat')
  handleHeartbeat(@ConnectedSocket() client: CustomSocket) {
    this.presenceService.heartbeat(client.id);
  }

  // --- NDI Bridge Integration ---

  @SubscribeMessage('ndi.identify_bridge')
  handleIdentifyBridge(
    @MessageBody() data: { bridgeName: string; productionId: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    client.data.isNdiBridge = true;
    client.data.bridgeName = data.bridgeName;
    client.data.productionId = data.productionId;
    void client.join(`production_${data.productionId}`);

    this.logger.log(
      `NDI Bridge "${data.bridgeName}" identified for production ${data.productionId}`,
    );

    // Notify frontend that bridge is online
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.bridge_status', {
        bridgeName: data.bridgeName,
        status: 'ONLINE',
      });
  }

  @SubscribeMessage('ndi.sources_update')
  handleSourcesUpdate(
    @MessageBody()
    data: {
      productionId: string;
      sources: Record<string, unknown>[];
    },
  ) {
    // Broadcast sources to all clients in the production
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.sources_received', {
        productionId: data.productionId,
        sources: data.sources,
      });
  }

  @SubscribeMessage('ndi.request_sync')
  handleRequestSync(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    // Forward request to all bridges in this production room
    this.server.to(`production_${data.productionId}`).emit('ndi.sync_request', {
      requesterId: client.id,
    });
  }

  // ------------------------------

  private startPresenceCleanup() {
    setInterval(() => {
      const timeout = 60000; // 1 minute
      const inactiveSocketIds =
        this.presenceService.getInactiveSockets(timeout);

      if (inactiveSocketIds.length > 0) {
        inactiveSocketIds.forEach((sid) => {
          this.presenceService.updateStatus(sid, 'OFFLINE');
          this.logger.warn(
            `Client ${sid} marked as OFFLINE due to inactivity.`,
          );
        });

        // Broadcast presence update for each active production
        const productions =
          this.presenceService.getProductionsWithActiveUsers();
        productions.forEach((pid) => this.broadcastPresence(pid));
      }
    }, 30000); // Check every 30s
  }

  handleRoleIdentify(
    @MessageBody() data: { roleId: string; roleName: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    this.presenceService.upsertPresence(client.id, {
      userId: client.handshake.query.userId as string,
      roleId: data.roleId,
      roleName: data.roleName,
      userName: (client.handshake.query.userName as string) || 'User',
      lastSeen: new Date().toISOString(),
      status: 'IDLE',
    });

    const productionId = client.data.productionId;
    if (productionId) {
      this.broadcastPresence(productionId);
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
  ) {
    console.log(
      `[Intercom] Sending command from ${data.senderId} to production ${data.productionId}`,
      data,
    );
    // Save to DB via service
    const command = await this.intercomService.sendCommand(data);

    // Update presence status for relevant users via PresenceService
    // Note: We use the server to find specific users or roles more efficiently if needed,
    // but here we just update our presence map for those online.
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
            (!data.targetUserId &&
              (rId === data.targetRoleId || !data.targetRoleId));

          if (isTargeted) {
            this.presenceService.updateStatus(sid, data.message);
          }
        }
      }
    }

    this.broadcastPresence(data.productionId);

    return { status: 'ok', commandId: command.id };
  }

  @SubscribeMessage('chat.direct')
  handleChatDirect(
    @MessageBody()
    data: {
      productionId: string;
      senderId: string;
      targetUserId: string;
      message: string;
      senderName?: string;
    },
  ) {
    console.log(
      `[Intercom] Direct Chat from ${data.senderId} to ${data.targetUserId}`,
    );

    const payload = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productionId: data.productionId,
      senderId: data.senderId,
      targetUserId: data.targetUserId,
      message: data.message,
      senderName: data.senderName,
      templateId: 'chat',
      requiresAck: false,
      createdAt: new Date().toISOString(),
      status: 'SENT',
      sender: {
        id: data.senderId,
        name: data.senderName || 'Sender',
      },
    };

    // Broadcast only to the specific production room (frontend handles filtering by targetUserId)
    this.server
      .to(`production_${data.productionId}`)
      .emit('command.received', payload);

    return { status: 'ok', messageId: payload.id };
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
    @ConnectedSocket() client: CustomSocket,
  ) {
    console.log(
      `[Intercom] Received Ack from ${data.responderId} for command ${data.commandId}`,
    );
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
    this.presenceService.updateStatus(client.id, `ACK:${data.responseType}`);

    if (data.productionId) this.broadcastPresence(data.productionId);

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
        productionId: payload.productionId,
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

    // Broadcast tally based on OBS Active Scene
    this.broadcastTallyState(
      payload.productionId,
      payload.sceneName,
      'PROGRAM',
    );
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
  @OnEvent('obs.screenshot.update')
  handleObsScreenshotUpdate(payload: {
    productionId: string;
    program?: string;
    preview?: string;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('obs.screenshot.update', payload);
  }

  @OnEvent('obs.audio.volume')
  handleObsAudioVolume(payload: {
    productionId: string;
    inputName: string;
    volumeMul: number;
    volumeDb: number;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('obs.audio.volume', payload);
  }

  @OnEvent('obs.audio.mute')
  handleObsAudioMute(payload: {
    productionId: string;
    inputName: string;
    muted: boolean;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('obs.audio.mute', payload);
  }

  @OnEvent('vmix.input.changed')
  handleVmixInputChanged(payload: {
    productionId: string;
    inputName?: string;
    inputTitle?: string;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('vmix.input.changed', payload);

    // Broadcast tally based on Vmix Active Input (Naive name match for now)
    const activeName = payload.inputName || payload.inputTitle || '';
    this.broadcastTallyState(payload.productionId, activeName, 'PROGRAM');
  }

  private broadcastTallyState(
    productionId: string,
    activeName: string,
    state: 'PROGRAM' | 'PREVIEW' | 'IDLE',
  ) {
    if (!activeName) return;
    const room = `production_${productionId}`;
    const socketsInRoom = this.server.sockets.adapter.rooms.get(room);

    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          const roleName = (
            (socket.handshake.query.roleName as string) || ''
          ).toLowerCase();
          const userName = (
            (socket.handshake.query.userName as string) || ''
          ).toLowerCase();

          // Very naive logic: if the scene/input name contains the role name (e.g., "CAMAROGRAFO") or user name, they are ON AIR
          if (roleName && activeName.toLowerCase().includes(roleName)) {
            socket.emit('tally_state_changed', {
              targetUserId: socket.handshake.query.userId,
              state,
            });
          } else if (userName && activeName.toLowerCase().includes(userName)) {
            socket.emit('tally_state_changed', {
              targetUserId: socket.handshake.query.userId,
              state,
            });
          } else {
            // Reset to IDLE if not matched
            // (In a real pro-grade system we check if they are in PREVIEW here)
            socket.emit('tally_state_changed', {
              targetUserId: socket.handshake.query.userId,
              state: 'IDLE',
            });
          }
        }
      }
    }
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
  handleCommandCreated(payload: {
    productionId: string;
    command: IntercomCommand;
  }) {
    this.logger.log(
      `Broadcasting new command for production ${payload.productionId}`,
    );
    this.server
      .to(`production_${payload.productionId}`)
      .emit('command.received', payload.command);
  }

  @OnEvent('production.health.stats')
  handleProductionHealthStats(payload: HealthStatsPayload) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('production.health.stats', payload);
  }

  @OnEvent('social.overlay_update')
  handleSocialOverlayUpdate(payload: {
    productionId: string;
    comment: SocialComment | null;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('social.overlay_update', payload);
  }

  // --- External Social Events Forwarding ---

  // --- External Social Events Forwarding ---

  @OnEvent('social.message.new')
  handleSocialMessageNew(payload: SocialComment & { productionId: string }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('social.message.new', payload);
  }

  @OnEvent('social.message.updated')
  handleSocialMessageUpdated(
    payload: SocialComment & { productionId: string },
  ) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('social.message.updated', payload);
  }

  @OnEvent('social.poll.created')
  handleSocialPollCreated(payload: {
    productionId: string;
    [key: string]: unknown;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('social.poll.created', payload);
  }

  @OnEvent('social.poll.updated')
  handleSocialPollUpdated(payload: {
    productionId: string;
    [key: string]: unknown;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('social.poll.updated', payload);
  }

  @OnEvent('social.poll.closed')
  handleSocialPollClosed(payload: {
    productionId: string;
    [key: string]: unknown;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('social.poll.closed', payload);
  }

  @OnEvent('graphics.social.show')
  handleGraphicsSocialShow(payload: {
    productionId: string;
    comment: SocialComment;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('graphics.social.show', payload);
  }

  @OnEvent('graphics.social.hide')
  handleGraphicsSocialHide(payload: { productionId: string }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('graphics.social.hide', payload);
  }

  @OnEvent('overlay.broadcast_data')
  handleOverlayBroadcastData(payload: {
    productionId: string;
    data: Record<string, unknown>;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('overlay.update_data', payload.data);
  }

  @OnEvent('overlay.template_updated')
  handleOverlayTemplateUpdated(payload: {
    productionId: string;
    template: { id: string; [key: string]: unknown };
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit(`overlay.template_update:${payload.template.id}`, payload.template);
  }

  @OnEvent('overlay.list_updated')
  handleOverlayListUpdated(payload: { productionId: string }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('overlay.list_updated', payload);
  }

  @OnEvent('production.updated')
  handleProductionUpdated(payload: { productionId: string }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('production.updated', payload);
  }

  @OnEvent('guest.slots.updated')
  handleGuestSlotsUpdated(payload: {
    productionId: string;
    slots: Record<string, unknown>[];
    updatedAt?: string;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('guest.slots.updated', payload);
  }

  @OnEvent('guest.returnfeed.updated')
  handleGuestReturnFeedUpdated(payload: {
    productionId: string;
    slotId: string;
    participantIdentity: string;
    returnFeed: 'PROGRAM' | 'PREVIEW' | 'CONTROL' | 'NONE';
    updatedAt?: string;
  }) {
    this.server
      .to(`production_${payload.productionId}`)
      .emit('guest.returnfeed.updated', payload);
  }

  // --- NDI Management Events ---

  @SubscribeMessage('ndi.bridge_register')
  async handleNdiBridgeRegister(
    @MessageBody() data: { productionId: string; bridgeName: string },
    @ConnectedSocket() client: CustomSocket,
  ) {
    this.logger.log(
      `NDI Bridge ${data.bridgeName} registered for production ${data.productionId}`,
    );
    await client.join(`production_${data.productionId}`);
    client.data.isNdiBridge = true;

    // Notify others in the room
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.bridge_status', {
        bridgeName: data.bridgeName,
        status: 'ONLINE',
      });
  }

  @SubscribeMessage('ndi.source_update')
  handleNdiSourceUpdate(
    @MessageBody()
    data: {
      productionId: string;
      sources: Array<{
        name: string;
        ipAddress?: string;
        port?: number;
        status: string;
      }>;
    },
  ) {
    this.logger.debug(
      `Received NDI sources update for production ${data.productionId}`,
    );

    // Broadcast update to the room (dashboard)
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.sources_received', {
        productionId: data.productionId,
        sources: data.sources,
      });
  }

  @SubscribeMessage('ndi.tally_control')
  handleNdiTallyControl(
    @MessageBody()
    data: {
      productionId: string;
      sourceName: string;
      tallyState: 'PROGRAM' | 'PREVIEW' | 'IDLE';
    },
  ) {
    this.logger.log(
      `Tally Control for ${data.sourceName} -> ${data.tallyState}`,
    );

    // Broadcast to the room so the Bridge (and dashboard) receives it
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.tally_update', data);
  }

  // --- NDI Professional Control Handlers ---

  @SubscribeMessage('ndi.ptz_command')
  handleNdiPtzCommand(
    @MessageBody()
    data: {
      productionId: string;
      sourceName: string;
      action:
        | 'move_up'
        | 'move_down'
        | 'move_left'
        | 'move_right'
        | 'zoom_in'
        | 'zoom_out'
        | 'stop';
      value?: number;
      speed?: number;
    },
  ) {
    this.logger.log(
      `PTZ Command: ${data.sourceName} -> ${data.action} (speed: ${data.speed})`,
    );

    // Reenviar el comando al NDI Bridge que está escuchando en la misma sala de producción
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.bridge.ptz_command', data);
  }

  @SubscribeMessage('ndi.route_source')
  handleNdiRouteSource(
    @MessageBody()
    data: {
      productionId: string;
      sourceName: string;
      destinationName: string;
    },
  ) {
    this.logger.log(`NDI Route: ${data.sourceName} -> ${data.destinationName}`);

    // Reenviar a la sala de producción para que el Bridge ejecute el ruteo
    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.bridge.route_source', data);
  }

  @SubscribeMessage('ndi.set_preset')
  handleNdiSetPreset(
    @MessageBody()
    data: {
      productionId: string;
      sourceName: string;
      presetIndex: number;
      action: 'recall' | 'save';
    },
  ) {
    this.logger.log(
      `NDI Preset: ${data.sourceName} index ${data.presetIndex} action ${data.action}`,
    );

    this.server
      .to(`production_${data.productionId}`)
      .emit('ndi.bridge.preset_command', data);
  }
}
