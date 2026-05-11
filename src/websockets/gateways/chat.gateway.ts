import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { ChatService } from '@/chat/chat.service';
import { IntercomService } from '@/intercom/intercom.service';
import { WsAuthGuard } from '@/websockets/guards/ws-auth.guard';
import type {
  AuthenticatedSocket,
  SocialCommentPayload,
} from '@/websockets/types/socket.types';

@WebSocketGateway()
@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly intercomService: IntercomService,
  ) {}

  @SubscribeMessage('chat.send')
  async handleChatSend(
    @MessageBody()
    data: {
      productionId: string;
      message: string;
      parentId?: string;
      mentionUserIds?: string[];
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.data.userId;
    this.logger.log(
      `Chat in production ${data.productionId} by user ${userId}`,
    );

    if (data.message.startsWith('/') && !data.parentId) {
      const parts = data.message.split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (command === '/alert' && args.trim()) {
        const intercomCommand = await this.intercomService.sendCommand({
          productionId: data.productionId,
          senderId: userId,
          message: args,
          requiresAck: true,
        });

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

    const message = await this.chatService.saveMessage(
      data.productionId,
      userId,
      data.message,
      data.parentId,
      data.mentionUserIds,
    );
    this.server
      .to(`production_${data.productionId}`)
      .emit('chat.received', message);
    return { status: 'ok', messageId: message.id };
  }

  @SubscribeMessage('chat.reaction.add')
  async handleReactionAdd(
    @MessageBody()
    data: { productionId: string; messageId: string; emoji: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.data.userId;
    const reaction = await this.chatService.addReaction(
      data.messageId,
      userId,
      data.emoji,
    );

    this.server
      .to(`production_${data.productionId}`)
      .emit('chat.reaction_added', {
        messageId: data.messageId,
        reaction,
      });

    return { status: 'ok' };
  }

  @SubscribeMessage('chat.reaction.remove')
  async handleReactionRemove(
    @MessageBody()
    data: { productionId: string; messageId: string; emoji: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.data.userId;
    await this.chatService.removeReaction(data.messageId, userId, data.emoji);

    this.server
      .to(`production_${data.productionId}`)
      .emit('chat.reaction_removed', {
        messageId: data.messageId,
        userId,
        emoji: data.emoji,
      });

    return { status: 'ok' };
  }

  @SubscribeMessage('chat.pin.toggle')
  async handlePinToggle(
    @MessageBody() data: { productionId: string; messageId: string },
  ) {
    const message = await this.chatService.togglePin(data.messageId);
    if (message) {
      this.server
        .to(`production_${data.productionId}`)
        .emit('chat.pinned_updated', {
          messageId: data.messageId,
          isPinned: message.isPinned,
        });
    }
    return { status: 'ok' };
  }

  @SubscribeMessage('chat.direct')
  handleChatDirect(
    @MessageBody()
    data: {
      productionId: string;
      targetUserId: string;
      message: string;
      senderName?: string;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const senderId = client.data.userId;
    this.logger.log(`Direct chat from ${senderId} to ${data.targetUserId}`);

    const payload = {
      id: `dm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productionId: data.productionId,
      userId: senderId,
      senderId,
      targetUserId: data.targetUserId,
      message: data.message,
      senderName: data.senderName,
      userName: data.senderName,
      createdAt: new Date().toISOString(),
    };

    this.server
      .to(`production_${data.productionId}`)
      .emit('chat.received', payload);
    return { status: 'ok', messageId: payload.id };
  }

  @SubscribeMessage('script.typing')
  handleChatTyping(
    @MessageBody()
    data: { productionId: string; userName: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    client.to(`production_${data.productionId}`).emit('chat.typing', {
      ...data,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('social.overlay')
  handleSocialOverlay(
    @MessageBody()
    data: {
      productionId: string;
      comment: SocialCommentPayload | null;
    },
  ): void {
    this.server
      .to(`production_${data.productionId}`)
      .emit('social.overlay_update', { comment: data.comment });
  }
}
