import { Module } from '@nestjs/common';
import { MediaService } from '@/media/media.service';
import { MediaController } from '@/media/media.controller';

@Module({
    providers: [MediaService],
    controllers: [MediaController],
    exports: [MediaService],
})
export class MediaModule { }
