import { Module } from '@nestjs/common';
import { VideoCallController } from './video-call.controller';
import { VideoCallService } from './video-call.service';
import { StreamingModule } from '@/streaming/streaming.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
    imports: [StreamingModule, PrismaModule],
    controllers: [VideoCallController],
    providers: [VideoCallService],
})
export class VideoCallModule { }
