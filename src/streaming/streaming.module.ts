import { Module } from '@nestjs/common';
import { StreamingController } from '@/streaming/streaming.controller';
import { StreamingService } from '@/streaming/streaming.service';
import { ObsModule } from '@/obs/obs.module';
import { VmixModule } from '@/vmix/vmix.module';

import { WebsocketsModule } from '@/websockets/websockets.module';
import { TallyService } from '@/streaming/tally.service';
import { AutomationService } from '@/streaming/automation.service';
import { StreamingDestinationsService } from '@/streaming/streaming-destinations.service';
import { LiveKitService } from '@/streaming/livekit.service';

@Module({
  imports: [ObsModule, VmixModule, WebsocketsModule],
  controllers: [StreamingController],
  providers: [StreamingService, TallyService, AutomationService, StreamingDestinationsService, LiveKitService],
  exports: [StreamingService, TallyService, AutomationService, StreamingDestinationsService, LiveKitService],
})
export class StreamingModule { }
