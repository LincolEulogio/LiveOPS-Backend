import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';
import { ObsModule } from '../obs/obs.module';
import { VmixModule } from '../vmix/vmix.module';

@Module({
    imports: [ObsModule, VmixModule],
    controllers: [StreamingController],
    providers: [StreamingService],
    exports: [StreamingService],
})
export class StreamingModule { }
