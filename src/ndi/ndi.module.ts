import { Module } from '@nestjs/common';
import { NdiController } from './ndi.controller';
import { NdiService } from './ndi.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, EventEmitterModule],
  controllers: [NdiController],
  providers: [NdiService],
  exports: [NdiService],
})
export class NdiModule {}
