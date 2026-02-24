import { PrismaService } from '../../prisma/prisma.service';
export declare enum AuditAction {
    INTERCOM_SEND = "INTERCOM_SEND",
    STREAM_START = "STREAM_START",
    STREAM_STOP = "STREAM_STOP",
    RECORD_START = "RECORD_START",
    RECORD_STOP = "RECORD_STOP",
    SCENE_CHANGE = "SCENE_CHANGE",
    AUTOMATION_TRIGGER = "AUTOMATION_TRIGGER",
    INSTANT_CLIP = "INSTANT_CLIP",
    USER_LOGIN = "USER_LOGIN",
    SYSTEM_ALERT = "SYSTEM_ALERT"
}
export declare class AuditService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(payload: {
        productionId?: string;
        userId?: string;
        action: AuditAction | string;
        details?: any;
        ipAddress?: string;
    }): Promise<void>;
    getLogs(productionId?: string, limit?: number, page?: number): Promise<{
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
