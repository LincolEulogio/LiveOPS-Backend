import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { ObsModule } from '../obs/obs.module';
import { VmixModule } from '../vmix/vmix.module';

import { WebsocketsModule } from '../websockets/websockets.module';
import { TallyService } from './tally.service';
import { AutomationService } from './automation.service';
import { StreamingDestinationsService } from './streaming-destinations.service';
import { LiveKitService } from './livekit.service';

@Module({
  imports: [ObsModule, VmixModule, WebsocketsModule],
  controllers: [StreamingController],
  providers: [StreamingService, TallyService, AutomationService, StreamingDestinationsService, LiveKitService],
  exports: [StreamingService, TallyService, AutomationService, StreamingDestinationsService, LiveKitService],
})
export class StreamingModule { }
