import { Module } from '@nestjs/common';
import { VideoCallController } from './video-call.controller';
import { VideoCallService } from './video-call.service';
import { StreamingModule } from '@/streaming/streaming.module';

@Module({
    imports: [StreamingModule],
    controllers: [VideoCallController],
    providers: [VideoCallService],
})
export class VideoCallModule { }
