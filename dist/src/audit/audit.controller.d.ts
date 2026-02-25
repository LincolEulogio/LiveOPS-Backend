import { AuditService } from '../common/services/audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getGlobalLogs(limit?: string, page?: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        eventType: string;
    }[] | ({
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        action: string;
        userId: string | null;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        ipAddress: string | null;
    })[]>;
    getProductionLogs(productionId: string, limit?: string, page?: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        eventType: string;
    }[] | ({
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        action: string;
        userId: string | null;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        ipAddress: string | null;
    })[]>;
}
