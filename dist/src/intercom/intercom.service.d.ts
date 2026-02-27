import { PrismaService } from '@/prisma/prisma.service';
import { PushNotificationsService } from '@/notifications/push-notifications.service';
import { CreateCommandTemplateDto, SendCommandDto } from '@/intercom/dto/intercom.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '@/common/services/audit.service';
import { AiService } from '@/ai/ai.service';
export declare class IntercomService {
    private prisma;
    private eventEmitter;
    private pushService;
    private auditService;
    private aiService;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, pushService: PushNotificationsService, auditService: AuditService, aiService: AiService);
    createTemplate(productionId: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        productionId: string;
        icon: string | null;
        color: string | null;
    }>;
    getTemplates(productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        productionId: string;
        icon: string | null;
        color: string | null;
    }[]>;
    private seedDefaultTemplates;
    updateTemplate(id: string, productionId: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        productionId: string;
        icon: string | null;
        color: string | null;
    }>;
    deleteTemplate(id: string, productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        productionId: string;
        icon: string | null;
        color: string | null;
    }>;
    getCommandHistory(productionId: string, limit?: number): Promise<({
        responses: ({
            responder: {
                id: string;
                name: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            commandId: string;
            response: string;
            note: string | null;
            responderId: string;
        })[];
        sender: {
            id: string;
            name: string | null;
        };
        targetRole: {
            id: string;
            name: string;
        } | null;
        template: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productionId: string;
            icon: string | null;
            color: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: string;
        productionId: string;
        senderId: string;
        targetRoleId: string | null;
        targetUserId: string | null;
        templateId: string | null;
        message: string;
        requiresAck: boolean;
    })[]>;
    getAiSummary(productionId: string): Promise<{
        summary: string;
    }>;
    summarizeHistory(productionId: string): Promise<{
        summary: string;
    }>;
    sendCommand(dto: SendCommandDto): Promise<{
        sender: {
            id: string;
            name: string | null;
        };
        targetRole: {
            id: string;
            name: string;
        } | null;
        template: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            productionId: string;
            icon: string | null;
            color: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        status: string;
        productionId: string;
        senderId: string;
        targetRoleId: string | null;
        targetUserId: string | null;
        templateId: string | null;
        message: string;
        requiresAck: boolean;
    }>;
    private handlePushNotification;
}
