import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboardMetrics(productionId: string): Promise<{
        productionId: string;
        totalEvents: number;
        breakdown: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.ProductionLogGroupByOutputType, "eventType"[]> & {
            _count: number;
        })[];
        totalOperatorActions: number;
    }>;
    getLogs(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        eventType: string;
    }[]>;
    exportCsv(productionId: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
