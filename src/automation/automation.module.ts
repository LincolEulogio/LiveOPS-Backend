import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@/prisma/prisma.module';
import { ObsModule } from '@/obs/obs.module';
import { VmixModule } from '@/vmix/vmix.module';
import { IntercomModule } from '@/intercom/intercom.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { AutomationService } from '@/automation/automation.service';
import { AutomationController } from '@/automation/automation.controller';
import { AutomationEngineService } from '@/automation/automation-engine.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ObsModule,
    VmixModule,
    IntercomModule,
    NotificationsModule,
  ],
  providers: [AutomationService, AutomationEngineService],
  controllers: [AutomationController],
  exports: [AutomationService, AutomationEngineService],
})
export class AutomationModule { }
