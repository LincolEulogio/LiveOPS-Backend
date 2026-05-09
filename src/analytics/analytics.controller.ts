import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { AnalyticsService } from '@/analytics/analytics.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('productions/:id/analytics')
@Protected()
export class AnalyticsController {
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
      console.error(`Telemetry Fetch Error for ${id}:`, error);
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
    return this.analyticsService.generateShowReport(id);
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
}
