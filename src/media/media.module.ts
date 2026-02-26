import { Module } from '@nestjs/common';
import { MediaService } from '@/media/media.service';
import { MediaController } from '@/media/media.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [MediaService],
    controllers: [MediaController],
    exports: [MediaService],
})
export class MediaModule { }
