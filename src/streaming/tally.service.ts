import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CoreGateway } from '@/websockets/gateways/core.gateway';

export interface TallyUpdate {
  productionId: string;
  engineType: 'OBS' | 'VMIX';
  program: string;
  preview?: string;
}

@Injectable()
export class TallyService {
  private readonly logger = new Logger(TallyService.name);

  constructor(private readonly coreGateway: CoreGateway) {}

  @OnEvent('obs.scene.changed')
  handleObsTally(payload: { productionId: string; sceneName: string }): void {
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
  }): void {
    this.broadcastTally({
      productionId: payload.productionId,
      engineType: 'VMIX',
      program: payload.activeInput.toString(),
      preview: payload.previewInput.toString(),
    });
  }

  private broadcastTally(update: TallyUpdate): void {
    this.coreGateway.server
      .to(`production_${update.productionId}`)
      .emit('streaming.tally', update);
  }
}
