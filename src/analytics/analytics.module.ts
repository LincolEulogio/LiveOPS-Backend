import { Module } from '@nestjs/common';
import { AnalyticsService } from '@/analytics/analytics.service';
import { AnalyticsController } from '@/analytics/analytics.controller';
import { PublicAnalyticsController } from '@/analytics/public-analytics.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController, PublicAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule { }
