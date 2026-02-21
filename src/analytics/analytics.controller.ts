import { Controller, Get, Param, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Parser } from 'json2csv';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    getDashboardMetrics(@Param('productionId') productionId: string) {
        return this.analyticsService.getDashboardMetrics(productionId);
    }

    @Get('logs')
    getLogs(@Param('productionId') productionId: string) {
        return this.analyticsService.getProductionLogs(productionId);
    }

    @Get('export')
    async exportCsv(
        @Param('productionId') productionId: string,
        @Res() res: Response
    ) {
        const logs = await this.analyticsService.getAllLogsForExport(productionId);

        // Simple CSV generation
        const header = 'id,productionId,eventType,createdAt,details\n';
        const csvData = logs.map((log: any) => ({
            id: log.id,
            timestamp: log.createdAt.toISOString(),
            eventType: log.eventType,
            details: JSON.stringify(log.details)
        }));

        const parser = new Parser({ fields: ['id', 'timestamp', 'eventType', 'details'] });
        const csv = await parser.parse(csvData);

        res.header('Content-Type', 'text/csv');
        res.attachment(`production_${productionId}_log.csv`);
        return res.send(csv);
    }
}
