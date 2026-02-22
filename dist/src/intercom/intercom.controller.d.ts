import { IntercomService } from './intercom.service';
import { CreateCommandTemplateDto } from './dto/intercom.dto';
export declare class IntercomController {
    private readonly intercomService;
    constructor(intercomService: IntercomService);
    createTemplate(productionId: string, dto: CreateCommandTemplateDto): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        icon: string | null;
        color: string | null;
    }>;
    getTemplates(productionId: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        icon: string | null;
        color: string | null;
    }[]>;
    updateTemplate(productionId: string, id: string, dto: CreateCommandTemplateDto): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        icon: string | null;
        color: string | null;
    }>;
    deleteTemplate(productionId: string, id: string): Promise<{
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
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
            description: string | null;
            productionId: string;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
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
        productionId: string;
        id: string;
        message: string;
        requiresAck: boolean;
        status: string;
        createdAt: Date;
        senderId: string;
        targetRoleId: string | null;
        templateId: string | null;
    })[]>;
}
