import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleEvent(eventPrefix: string, payload: any): Promise<void>;
    handleOperatorActivity(eventPrefix: string, payload: any): Promise<void>;
    getDashboardMetrics(productionId: string): Promise<{
        productionId: string;
        totalEvents: number;
        breakdown: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.ProductionLogGroupByOutputType, "eventType"[]> & {
            _count: number;
        })[];
        totalOperatorActions: number;
    }>;
    getProductionLogs(productionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        eventType: string;
    }[]>;
    getAllLogsForExport(productionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        eventType: string;
    }[]>;
}
