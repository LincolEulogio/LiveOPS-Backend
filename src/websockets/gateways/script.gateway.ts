import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { ScriptService } from '@/script/script.service';
import { WsAuthGuard } from '@/websockets/guards/ws-auth.guard';
import type { AuthenticatedSocket } from '@/websockets/types/socket.types';

@WebSocketGateway()
@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ScriptGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScriptGateway.name);
  // In-memory debounce timers for script persistence.
  // Pending writes are lost on restart (1s window). Acceptable trade-off for
  // collaborative editing — clients resync from DB on reconnect via script.sync.
  private readonly scriptUpdateTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly scriptService: ScriptService) {}

  @SubscribeMessage('script.sync')
  async handleScriptSync(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const script = await this.scriptService.getScriptState(data.productionId);
    client.emit('script.sync_response', { content: script?.content || null });
  }

  @SubscribeMessage('script.update')
  handleScriptUpdate(
    @MessageBody() data: { productionId: string; update: number[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    const updateArray = new Uint8Array(data.update);

    client.to(`production_${data.productionId}`).emit('script.update_received', {
      update: updateArray,
    });

    const existing = this.scriptUpdateTimers.get(data.productionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.scriptUpdateTimers.delete(data.productionId);
      this.scriptService
        .updateScriptState(data.productionId, Buffer.from(updateArray))
        .catch((err: unknown) => {
          this.logger.error(
            'Failed to persist script update',
            err instanceof Error ? err.message : String(err),
          );
        });
    }, 1_000);

    this.scriptUpdateTimers.set(data.productionId, timer);
  }

  @SubscribeMessage('script.awareness_update')
  handleAwarenessUpdate(
    @MessageBody() data: { productionId: string; update: number[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    client.to(`production_${data.productionId}`).emit('script.awareness_received', {
      update: data.update,
    });
  }

  @SubscribeMessage('script.scroll_sync')
  handleScriptScrollSync(
    @MessageBody() data: { productionId: string; scrollPercentage: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    client.to(`production_${data.productionId}`).emit('script.scroll_received', {
      scrollPercentage: data.scrollPercentage,
    });
  }
}
