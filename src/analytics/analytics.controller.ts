import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Logger,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { AnalyticsService } from '@/analytics/analytics.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { AlertThreshold, RetentionConfig } from '@/analytics/analytics.types';

@Controller('productions/:id/analytics')
@Protected()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('telemetry')
  @Permissions('production:view')
  async getTelemetry(
    @Param('id') id: string,
    @Query('minutes') minutes?: string,
  ) {
    try {
      const mins = minutes ? parseInt(minutes, 10) : 60;
      return await this.analyticsService.getTelemetryLogs(id, mins);
    } catch (error: unknown) {
      this.logger.error(
        `Telemetry fetch failed for production ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Get('report')
  @Permissions('production:view')
  async getReport(@Param('id') id: string) {
    return this.analyticsService.getShowReport(id);
  }

  @Post('report/generate')
  @Permissions('production:manage')
  async generateReport(@Param('id') id: string) {
    return this.analyticsService.enqueueShowReport(id);
  }

  @Get('seo-package')
  @Permissions('production:view')
  async getSeoPackage(@Param('id') id: string) {
    return this.analyticsService.getPostShowSeo(id);
  }

  @Get('metrics')
  @Permissions('production:view')
  async getMetrics(@Param('id') id: string) {
    return this.analyticsService.getDashboardMetrics(id);
  }

  @Get('compare')
  @Permissions('production:view')
  async compareProductions(
    @Param('id') id: string,
    @Query('compareWith') compareWith: string,
    @Query('minutes') minutes?: string,
  ) {
    const mins = minutes ? parseInt(minutes, 10) : 60;
    return this.analyticsService.compareProductions(id, compareWith, mins);
  }

  @Get('alerts/thresholds')
  @Permissions('production:view')
  getAlertThresholds(@Param('id') id: string) {
    return this.analyticsService.getAlertThresholds(id);
  }

  @Post('alerts/thresholds')
  @Permissions('production:manage')
  setAlertThreshold(
    @Param('id') id: string,
    @Body() threshold: AlertThreshold,
  ) {
    return this.analyticsService.setAlertThreshold(id, threshold);
  }

  @Delete('alerts/thresholds/:metric')
  @Permissions('production:manage')
  removeAlertThreshold(
    @Param('id') id: string,
    @Param('metric') metric: AlertThreshold['metric'],
  ) {
    return this.analyticsService.removeAlertThreshold(id, metric);
  }

  @Post('retention')
  @Permissions('production:manage')
  setRetention(
    @Param('id') id: string,
    @Body() config: RetentionConfig,
  ) {
    return this.analyticsService.setRetentionConfig(id, config);
  }

  @Get('retention')
  @Permissions('production:view')
  getRetention(@Param('id') id: string) {
    return this.analyticsService.getRetentionConfig(id);
  }
}
