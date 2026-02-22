import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { ObsModule } from '../obs/obs.module';
import { VmixModule } from '../vmix/vmix.module';

import { WebsocketsModule } from '../websockets/websockets.module';
import { TallyService } from './tally.service';
import { AutomationService } from './automation.service';

@Module({
  imports: [ObsModule, VmixModule, WebsocketsModule],
  controllers: [StreamingController],
  providers: [StreamingService, TallyService, AutomationService],
  exports: [StreamingService, TallyService, AutomationService],
})
export class StreamingModule {}
