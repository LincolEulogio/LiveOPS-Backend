import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsGateway } from '@/websockets/events.gateway';

export interface TallyUpdate {
  productionId: string;
  engineType: 'OBS' | 'VMIX';
  program: string; // Scene name or Input number
  preview?: string;
}

@Injectable()
export class TallyService {
  private readonly logger = new Logger(TallyService.name);

  constructor(private eventsGateway: EventsGateway) {}

  @OnEvent('obs.scene.changed')
  handleObsTally(payload: { productionId: string; sceneName: string }) {
    this.broadcastTally({
      productionId: payload.productionId,
      engineType: 'OBS',
      program: payload.sceneName,
    });
  }

  @OnEvent('vmix.input.changed')
  handleVmixTally(payload: {
    productionId: string;
    activeInput: number;
    previewInput: number;
  }) {
    this.broadcastTally({
      productionId: payload.productionId,
      engineType: 'VMIX',
      program: payload.activeInput.toString(),
      preview: payload.previewInput.toString(),
    });
  }

  private broadcastTally(update: TallyUpdate) {
    this.eventsGateway.server
      .to(`production:${update.productionId}`)
      .emit('streaming.tally', update);
  }
}
