import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@/prisma/prisma.module';
import { ScriptService } from './script.service';
import { HocuspocusService } from './hocuspocus.service';

@Module({
  imports: [PrismaModule, ConfigModule, ScheduleModule.forRoot()],
  providers: [ScriptService, HocuspocusService],
  exports: [ScriptService, HocuspocusService],
})
export class ScriptModule {}
