import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandTemplateDto } from './dto/intercom.dto';
export declare class IntercomService {
    private prisma;
    constructor(prisma: PrismaService);
    createTemplate(productionId: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
    }>;
    getTemplates(productionId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
    }[]>;
    private seedDefaultTemplates;
    updateTemplate(id: string, productionId: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
    }>;
    deleteTemplate(id: string, productionId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
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
            name: string;
            description: string | null;
            icon: string | null;
            color: string | null;
            createdAt: Date;
            updatedAt: Date;
            productionId: string;
        } | null;
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
    } & {
        id: string;
        createdAt: Date;
        productionId: string;
        senderId: string;
        targetRoleId: string | null;
        templateId: string | null;
        message: string;
        requiresAck: boolean;
        status: string;
    })[]>;
}
