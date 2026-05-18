import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@/prisma/prisma.module';
import { ObsModule } from '@/obs/obs.module';
import { VmixModule } from '@/vmix/vmix.module';
import { IntercomModule } from '@/intercom/intercom.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { AuditModule } from '@/audit/audit.module';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationConditionEvaluator } from './automation-condition.evaluator';
import { AutomationActionExecutor } from './automation-action.executor';

const ENGINE_PROVIDERS = [
  AutomationEngineService,
  AutomationConditionEvaluator,
  AutomationActionExecutor,
];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ObsModule,
    VmixModule,
    IntercomModule,
    NotificationsModule,
    AuditModule,
  ],
  providers: [AutomationService, ...ENGINE_PROVIDERS],
  controllers: [AutomationController],
  exports: [AutomationService, AutomationEngineService],
})
export class AutomationModule {}
