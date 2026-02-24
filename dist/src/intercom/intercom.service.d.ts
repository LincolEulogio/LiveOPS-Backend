import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../notifications/push-notifications.service';
import { CreateCommandTemplateDto, SendCommandDto } from './dto/intercom.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../common/services/audit.service';
export declare class IntercomService {
    private prisma;
    private eventEmitter;
    private pushService;
    private auditService;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, pushService: PushNotificationsService, auditService: AuditService);
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
            responderId: string;
            response: string;
            note: string | null;
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
