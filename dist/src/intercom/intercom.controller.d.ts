import { IntercomService } from './intercom.service';
import { CreateCommandTemplateDto } from './dto/intercom.dto';
export declare class IntercomController {
    private readonly intercomService;
    constructor(intercomService: IntercomService);
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
    updateTemplate(productionId: string, id: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
    }>;
    deleteTemplate(productionId: string, id: string): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
    }>;
    getCommandHistory(productionId: string): Promise<({
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
}
