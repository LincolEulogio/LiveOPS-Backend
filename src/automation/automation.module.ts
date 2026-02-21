import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ObsModule } from '../obs/obs.module';
import { VmixModule } from '../vmix/vmix.module';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { AutomationEngineService } from './automation-engine.service';

@Module({
  imports: [PrismaModule, ObsModule, VmixModule],
  providers: [AutomationService, AutomationEngineService],
  controllers: [AutomationController],
  exports: [AutomationService, AutomationEngineService]
})
export class AutomationModule { }
