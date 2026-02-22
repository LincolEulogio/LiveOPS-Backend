import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandTemplateDto, SendCommandDto } from './dto/intercom.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class IntercomService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    createTemplate(productionId: string, dto: CreateCommandTemplateDto): Promise<{
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getTemplates(productionId: string): Promise<{
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    private seedDefaultTemplates;
    updateTemplate(id: string, productionId: string, dto: CreateCommandTemplateDto): Promise<{
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteTemplate(id: string, productionId: string): Promise<{
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getCommandHistory(productionId: string, limit?: number): Promise<({
        sender: {
            name: string | null;
            id: string;
        };
        targetRole: {
            name: string;
            id: string;
        } | null;
        template: {
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
            productionId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        responses: ({
            responder: {
                name: string | null;
                id: string;
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
        productionId: string;
        senderId: string;
        targetRoleId: string | null;
        templateId: string | null;
        message: string;
        requiresAck: boolean;
        id: string;
        createdAt: Date;
        status: string;
    })[]>;
    sendCommand(dto: SendCommandDto): Promise<{
        sender: {
            name: string | null;
            id: string;
        };
        targetRole: {
            name: string;
            id: string;
        } | null;
        template: {
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
            productionId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        productionId: string;
        senderId: string;
        targetRoleId: string | null;
        templateId: string | null;
        message: string;
        requiresAck: boolean;
        id: string;
        createdAt: Date;
        status: string;
    }>;
}
