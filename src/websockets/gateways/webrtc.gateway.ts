import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { PresenceService } from '@/websockets/presence.service';
import { WsAuthGuard } from '@/websockets/guards/ws-auth.guard';
import { SocketEvents } from '@/common/socket-events';
import type { WebRTCSignalPayload } from '@/common/types/webrtc.types';
import type { AuthenticatedSocket } from '@/websockets/types/socket.types';

@WebSocketGateway({ namespace: '/webrtc' })
@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WebRTCGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly presenceService: PresenceService) {}

  @SubscribeMessage('webrtc.signal')
  handleWebRTCSignal(
    @MessageBody() data: WebRTCSignalPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    const senderUserId = client.data.userId;
    const targetSocketIds = this.presenceService.getSocketIdsForUser(data.targetUserId);

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
    data: { productionId: string; isTalking: boolean; targetUserId?: string | null },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    this.server.to(`production_${data.productionId}`).emit('webrtc.talking', {
      senderUserId: client.data.userId,
      isTalking: data.isTalking,
      targetUserId: data.targetUserId ?? null,
    });
  }

  @SubscribeMessage(SocketEvents.WEBRTC_AUDIO_LEVEL)
  handleWebRTCAudioLevel(
    @MessageBody() data: { productionId: string; level: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    client.to(`production_${data.productionId}`).emit(SocketEvents.WEBRTC_AUDIO_LEVEL_RECEIVED, {
      senderUserId: client.data.userId,
      level: data.level,
    });
  }

  /**
   * IFB push: operator requests a real-time volume change in a specific
   * reporter's earpiece. Broadcasts to the whole production room; the guest
   * app filters by targetParticipantIdentity on the client side.
   */
  @SubscribeMessage(SocketEvents.GUEST_IFB_PUSH)
  handleGuestIFBPush(
    @MessageBody()
    data: {
      productionId: string;
      targetParticipantIdentity: string;
      volume: number;
      active: boolean;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    this.server.to(`production_${data.productionId}`).emit(SocketEvents.GUEST_IFB_RECEIVED, {
      productionId: data.productionId,
      targetParticipantIdentity: data.targetParticipantIdentity,
      volume: Math.min(1, Math.max(0, data.volume)),
      active: data.active,
      fromUserId: client.data.userId,
    });
  }
}
