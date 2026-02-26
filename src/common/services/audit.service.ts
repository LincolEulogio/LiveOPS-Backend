import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export enum AuditAction {
    INTERCOM_SEND = 'INTERCOM_SEND',
    STREAM_START = 'STREAM_START',
    STREAM_STOP = 'STREAM_STOP',
    RECORD_START = 'RECORD_START',
    RECORD_STOP = 'RECORD_STOP',
    SCENE_CHANGE = 'SCENE_CHANGE',
    AUTOMATION_TRIGGER = 'AUTOMATION_TRIGGER',
    INSTANT_CLIP = 'INSTANT_CLIP',
    USER_LOGIN = 'USER_LOGIN',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
    TIMELINE_START = 'TIMELINE_START',
    TIMELINE_COMPLETE = 'TIMELINE_COMPLETE',
    TIMELINE_RESET = 'TIMELINE_RESET',
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private prisma: PrismaService) { }

    async log(payload: {
        productionId?: string;
        userId?: string;
        action: AuditAction | string;
        details?: any;
        ipAddress?: string;
    }) {
        try {
            // 1. Log to AuditLog (Global/System Level)
            await this.prisma.auditLog.create({
                data: {
                    userId: payload.userId,
                    action: payload.action,
                    details: payload.details,
                    ipAddress: payload.ipAddress,
                },
            });

            // 2. If productionId is provided, also log to ProductionLog (Show Specific)
            if (payload.productionId) {
                await this.prisma.productionLog.create({
                    data: {
                        productionId: payload.productionId,
                        eventType: payload.action,
                        details: payload.details,
                    },
                });
            }

            this.logger.debug(`Audit log created: ${payload.action} for production ${payload.productionId || 'GLOBAL'}`);
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`);
        }
    }

    async getLogs(productionId?: string, limit: number = 100, page: number = 1) {
        const skip = (page - 1) * limit;

        if (productionId) {
            return this.prisma.productionLog.findMany({
                where: { productionId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            });
        }

        return this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true } } },
            take: limit,
            skip,
        });
    }
}
