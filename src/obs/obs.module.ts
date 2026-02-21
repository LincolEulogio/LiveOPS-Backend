import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ObsConnectionManager } from './obs-connection.manager';
import { ObsService } from './obs.service';
import { ObsController } from './obs.controller';

@Module({
  imports: [PrismaModule],
  providers: [ObsService, ObsConnectionManager],
  controllers: [ObsController],
  exports: [ObsService, ObsConnectionManager]
})
export class ObsModule { }
