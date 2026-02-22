import { IntercomService } from './intercom.service';
import { CreateCommandTemplateDto } from './dto/intercom.dto';
export declare class IntercomController {
    private readonly intercomService;
    constructor(intercomService: IntercomService);
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
    updateTemplate(productionId: string, id: string, dto: CreateCommandTemplateDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
    }>;
    deleteTemplate(productionId: string, id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
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
        targetUserId: string | null;
        templateId: string | null;
        message: string;
        requiresAck: boolean;
        status: string;
    })[]>;
}
