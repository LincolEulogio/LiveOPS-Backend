import { Module } from '@nestjs/common';
import { StreamingController } from '@/streaming/streaming.controller';
import { StreamingService } from '@/streaming/streaming.service';
import { ObsModule } from '@/obs/obs.module';
import { VmixModule } from '@/vmix/vmix.module';

import { WebsocketsModule } from '@/websockets/websockets.module';
import { TallyService } from '@/streaming/tally.service';
import { StreamingAutomationService } from '@/streaming/automation.service';
import { StreamingDestinationsService } from '@/streaming/streaming-destinations.service';
import { LiveKitService } from '@/streaming/livekit.service';
import { StreamSchedulerService } from '@/streaming/stream-scheduler.service';
import { SrsService } from '@/streaming/srs/srs.service';
import { SrsWebhookController } from '@/streaming/srs/srs-webhook.controller';

@Module({
  imports: [ObsModule, VmixModule, WebsocketsModule],
  controllers: [StreamingController, SrsWebhookController],
  providers: [
    StreamingService,
    TallyService,
    StreamingAutomationService,
    StreamingDestinationsService,
    LiveKitService,
    StreamSchedulerService,
    SrsService,
  ],
  exports: [
    StreamingService,
    TallyService,
    StreamingAutomationService,
    StreamingDestinationsService,
    LiveKitService,
    SrsService,
  ],
})
export class StreamingModule {}
