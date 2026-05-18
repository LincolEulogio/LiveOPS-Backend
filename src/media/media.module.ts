import { Module } from '@nestjs/common';
import { MediaService } from '@/media/media.service';
import { MediaController } from '@/media/media.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AiModule } from '@/ai/ai.module';
import { STORAGE_PROVIDER } from './storage.provider';
import { UploadThingProvider } from './uploadthing.provider';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [
    MediaService,
    { provide: STORAGE_PROVIDER, useClass: UploadThingProvider },
  ],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
