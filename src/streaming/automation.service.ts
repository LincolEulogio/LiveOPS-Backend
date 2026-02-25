import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StreamingService } from '@/streaming/streaming.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private streamingService: StreamingService) { }

  @OnEvent('timeline.block.started')
  async handleBlockStarted(payload: {
    productionId: string;
    blockId: string;
    linkedScene?: string;
  }) {
    if (!payload.linkedScene) return;

    this.logger.log(
      `Automation: Block ${payload.blockId} started. Triggering scene: ${payload.linkedScene}`,
    );

    try {
      await this.streamingService.handleCommand(payload.productionId, {
        type: 'CHANGE_SCENE',
        sceneName: payload.linkedScene,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(
        `Automation failed for block ${payload.blockId}: ${message}`,
      );
    }
  }
}
