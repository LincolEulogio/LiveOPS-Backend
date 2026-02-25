import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ObsConnectionManager } from '@/obs/obs-connection.manager';
import { ObsService } from '@/obs/obs.service';
import { ObsController } from '@/obs/obs.controller';

@Module({
  imports: [PrismaModule],
  providers: [ObsService, ObsConnectionManager],
  controllers: [ObsController],
  exports: [ObsService, ObsConnectionManager],
})
export class ObsModule {}
