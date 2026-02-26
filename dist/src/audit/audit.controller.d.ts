import { AuditService } from '@/common/services/audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getGlobalLogs(limit?: string, page?: string): Promise<{
        id: string;
        productionId: string;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
    }[] | ({
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
        userId: string | null;
        action: string;
        ipAddress: string | null;
    })[]>;
    getProductionLogs(productionId: string, limit?: string, page?: string): Promise<{
        id: string;
        productionId: string;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
    }[] | ({
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
        userId: string | null;
        action: string;
        ipAddress: string | null;
    })[]>;
}
