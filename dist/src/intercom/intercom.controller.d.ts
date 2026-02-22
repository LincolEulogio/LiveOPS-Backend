import { IntercomService } from './intercom.service';
import { CreateCommandTemplateDto } from './dto/intercom.dto';
export declare class IntercomController {
    private readonly intercomService;
    constructor(intercomService: IntercomService);
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
    updateTemplate(productionId: string, id: string, dto: CreateCommandTemplateDto): Promise<{
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteTemplate(productionId: string, id: string): Promise<{
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getCommandHistory(productionId: string): Promise<({
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
            commandId: string;
            responderId: string;
            response: string;
            note: string | null;
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
}
