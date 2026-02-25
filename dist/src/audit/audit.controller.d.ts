import { AuditService } from '../common/services/audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getGlobalLogs(limit?: string, page?: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
    }[] | ({
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        userId: string | null;
        createdAt: Date;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        action: string;
        ipAddress: string | null;
    })[]>;
    getProductionLogs(productionId: string, limit?: string, page?: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
    }[] | ({
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        userId: string | null;
        createdAt: Date;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        action: string;
        ipAddress: string | null;
    })[]>;
}
