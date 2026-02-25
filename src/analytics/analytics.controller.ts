import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from '@/analytics/analytics.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('productions/:id/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('telemetry')
  @Permissions('production:view')
  async getTelemetry(@Param('id') id: string, @Query('minutes') minutes?: string) {
    try {
      const mins = minutes ? parseInt(minutes, 10) : 60;
      return await this.analyticsService.getTelemetryLogs(id, mins);
    } catch (error) {
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
}
