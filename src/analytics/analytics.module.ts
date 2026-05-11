import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsService } from '@/analytics/analytics.service';
import { AnalyticsController } from '@/analytics/analytics.controller';
import { PublicAnalyticsController } from '@/analytics/public-analytics.controller';
import { AnalyticsGateway } from '@/analytics/analytics.gateway';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [AnalyticsController, PublicAnalyticsController],
  providers: [AnalyticsService, AnalyticsGateway],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
