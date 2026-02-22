import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandTemplateDto, SendCommandDto } from './dto/intercom.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class IntercomService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    createTemplate(productionId: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
    }>;
    getTemplates(productionId: string): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
    }[]>;
    private seedDefaultTemplates;
    updateTemplate(id: string, productionId: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
    }>;
    deleteTemplate(id: string, productionId: string): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
    }>;
    getCommandHistory(productionId: string, limit?: number): Promise<({
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
            productionId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
        } | null;
        responses: ({
            responder: {
                id: string;
                name: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            response: string;
            note: string | null;
            commandId: string;
            responderId: string;
        })[];
    } & {
        id: string;
        productionId: string;
        createdAt: Date;
        status: string;
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
            productionId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
        } | null;
    } & {
        id: string;
        productionId: string;
        createdAt: Date;
        status: string;
        senderId: string;
        targetRoleId: string | null;
        targetUserId: string | null;
        templateId: string | null;
        message: string;
        requiresAck: boolean;
    }>;
}
