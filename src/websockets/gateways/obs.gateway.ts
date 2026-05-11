import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatService } from '@/chat/chat.service';
import { WsAuthGuard } from '@/websockets/guards/ws-auth.guard';
import type { NdiSource } from '@/websockets/types/socket.types';

type TallyState = 'PROGRAM' | 'PREVIEW' | 'IDLE';

@WebSocketGateway()
@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ObsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ObsGateway.name);

  constructor(private readonly chatService: ChatService) {}

  // ─── OBS Event Handlers ──────────────────────────────────────────────────────

  @OnEvent('obs.scene.changed')
  async handleObsSceneChanged(payload: {
    productionId: string;
    sceneName: string;
    cpuUsage?: number;
    fps?: number;
  }): Promise<void> {
    this.server.to(`production_${payload.productionId}`).emit('obs.scene.changed', {
      productionId: payload.productionId,
      sceneName: payload.sceneName,
      cpuUsage: payload.cpuUsage,
      fps: payload.fps,
    });

    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      `🎬 Escena cambiada a: ${payload.sceneName}`,
    );
    this.server.to(`production_${payload.productionId}`).emit('chat.received', msg);
    this.broadcastTallyState(payload.productionId, payload.sceneName, 'PROGRAM');
  }

  @OnEvent('obs.stream.state')
  async handleObsStreamState(payload: {
    productionId: string;
    active: boolean;
    state: string;
  }): Promise<void> {
    this.server.to(`production_${payload.productionId}`).emit('obs.stream.state', payload);
    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      payload.active
        ? `🔴 EMISIÓN INICIADA (${payload.state})`
        : `⚪ EMISIÓN DETENIDA (${payload.state})`,
    );
    this.server.to(`production_${payload.productionId}`).emit('chat.received', msg);
  }

  @OnEvent('obs.record.state')
  async handleObsRecordState(payload: {
    productionId: string;
    active: boolean;
    state: string;
  }): Promise<void> {
    this.server.to(`production_${payload.productionId}`).emit('obs.record.state', payload);
    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      payload.active
        ? `⏺️ GRABACIÓN INICIADA (${payload.state})`
        : `⏹️ GRABACIÓN DETENIDA (${payload.state})`,
    );
    this.server.to(`production_${payload.productionId}`).emit('chat.received', msg);
  }

  @OnEvent('obs.replaybuffer.state')
  handleObsReplayBufferState(payload: { productionId: string; active: boolean; state: string }): void {
    this.server.to(`production_${payload.productionId}`).emit('obs.replaybuffer.state', payload);
  }

  @OnEvent('obs.virtualcam.state')
  handleObsVirtualCamState(payload: { productionId: string; active: boolean; state: string }): void {
    this.server.to(`production_${payload.productionId}`).emit('obs.virtualcam.state', payload);
  }

  @OnEvent('obs.studiomode.changed')
  handleObsStudioModeChanged(payload: { productionId: string; studioModeEnabled: boolean }): void {
    this.server.to(`production_${payload.productionId}`).emit('obs.studiomode.changed', payload);
  }

  @OnEvent('obs.scenecollection.changed')
  handleObsSceneCollectionChanged(payload: { productionId: string; sceneCollectionName: string }): void {
    this.server.to(`production_${payload.productionId}`).emit('obs.scenecollection.changed', payload);
  }

  @OnEvent('obs.transition.changed')
  handleObsTransitionChanged(payload: { productionId: string; transitionName: string }): void {
    this.server.to(`production_${payload.productionId}`).emit('obs.transition.changed', payload);
  }

  @OnEvent('obs.connection.state')
  async handleObsConnectionState(payload: {
    productionId: string;
    connected: boolean;
  }): Promise<void> {
    this.server.to(`production_${payload.productionId}`).emit('obs.connection.state', payload);
    const msg = await this.chatService.saveMessage(
      payload.productionId,
      null,
      payload.connected ? `🔗 OBS CONECTADO` : `❌ OBS DESCONECTADO`,
    );
    this.server.to(`production_${payload.productionId}`).emit('chat.received', msg);
  }

  @OnEvent('obs.connection.alert')
  handleObsConnectionAlert(payload: {
    productionId: string;
    connectionId: string;
    attempts: number;
    wasStreaming: boolean;
  }): void {
    this.server.to(`production_${payload.productionId}`).emit('obs.connection.alert', payload);
  }

  // ─── vMix Event Handlers ─────────────────────────────────────────────────────

  @OnEvent('vmix.input.changed')
  handleVmixInputChanged(payload: {
    productionId: string;
    inputName?: string;
    inputTitle?: string;
  }): void {
    this.server.to(`production_${payload.productionId}`).emit('vmix.input.changed', payload);
    const activeName = payload.inputName ?? payload.inputTitle ?? '';
    this.broadcastTallyState(payload.productionId, activeName, 'PROGRAM');
  }

  // ─── Overlay Event Handlers ──────────────────────────────────────────────────

  @OnEvent('overlay.broadcast_data')
  handleOverlayBroadcastData(payload: {
    productionId: string;
    data: Record<string, unknown>;
  }): void {
    this.server.to(`production_${payload.productionId}`).emit('overlay.update_data', payload.data);
  }

  @OnEvent('overlay.template_updated')
  handleOverlayTemplateUpdated(payload: {
    productionId: string;
    template: { id: string; [key: string]: unknown };
  }): void {
    this.server
      .to(`production_${payload.productionId}`)
      .emit(`overlay.template_update:${payload.template.id}`, payload.template);
  }

  // ─── NDI Control Handlers ────────────────────────────────────────────────────

  @SubscribeMessage('ndi.source_update')
  handleNdiSourceUpdate(
    @MessageBody()
    data: { productionId: string; sources: NdiSource[] },
  ): void {
    this.logger.debug(`NDI sources update for production ${data.productionId}`);
    this.server.to(`production_${data.productionId}`).emit('ndi.sources_received', {
      productionId: data.productionId,
      sources: data.sources,
    });
  }

  @SubscribeMessage('ndi.tally_control')
  handleNdiTallyControl(
    @MessageBody()
    data: { productionId: string; sourceName: string; tallyState: TallyState },
  ): void {
    this.logger.log(`Tally Control: ${data.sourceName} → ${data.tallyState}`);
    this.server.to(`production_${data.productionId}`).emit('ndi.tally_update', data);
  }

  @SubscribeMessage('ndi.ptz_command')
  handleNdiPtzCommand(
    @MessageBody()
    data: {
      productionId: string;
      sourceName: string;
      action: 'move_up' | 'move_down' | 'move_left' | 'move_right' | 'zoom_in' | 'zoom_out' | 'stop';
      value?: number;
      speed?: number;
    },
  ): void {
    this.logger.log(`PTZ: ${data.sourceName} → ${data.action}`);
    this.server.to(`production_${data.productionId}`).emit('ndi.bridge.ptz_command', data);
  }

  @SubscribeMessage('ndi.route_source')
  handleNdiRouteSource(
    @MessageBody()
    data: { productionId: string; sourceName: string; destinationName: string },
  ): void {
    this.logger.log(`NDI Route: ${data.sourceName} → ${data.destinationName}`);
    this.server.to(`production_${data.productionId}`).emit('ndi.bridge.route_source', data);
  }

  @SubscribeMessage('ndi.set_preset')
  handleNdiSetPreset(
    @MessageBody()
    data: { productionId: string; sourceName: string; presetIndex: number; action: 'recall' | 'save' },
  ): void {
    this.logger.log(`NDI Preset: ${data.sourceName} index ${data.presetIndex} action ${data.action}`);
    this.server.to(`production_${data.productionId}`).emit('ndi.bridge.preset_command', data);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private broadcastTallyState(
    productionId: string,
    activeName: string,
    state: TallyState,
  ): void {
    if (!activeName) return;
    const room = `production_${productionId}`;
    const socketsInRoom = this.server.sockets.adapter.rooms.get(room);
    if (!socketsInRoom) return;

    for (const socketId of socketsInRoom) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) continue;

      const roleName = ((socket.handshake.query.roleName as string) || '').toLowerCase();
      const userName = ((socket.handshake.query.userName as string) || '').toLowerCase();
      const lowerActive = activeName.toLowerCase();

      const isOnAir =
        (roleName && lowerActive.includes(roleName)) ||
        (userName && lowerActive.includes(userName));

      socket.emit('tally_state_changed', {
        targetUserId: socket.handshake.query.userId,
        state: isOnAir ? state : 'IDLE',
      });
    }
  }
}
