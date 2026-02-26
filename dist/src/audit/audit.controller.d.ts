import { AuditService } from '@/common/services/audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getGlobalLogs(limit?: string, page?: string): Promise<({
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        productionId: string;
        userId: string | null;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
    })[] | ({
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        userId: string | null;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
        action: string;
        ipAddress: string | null;
    })[]>;
    getProductionLogs(productionId: string, limit?: string, page?: string): Promise<({
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        productionId: string;
        userId: string | null;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
    })[] | ({
        user: {
            id: string;
            email: string;
            name: string | null;
        } | null;
    } & {
        id: string;
        userId: string | null;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
        action: string;
        ipAddress: string | null;
    })[]>;
}
