export declare class CreateCommandTemplateDto {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
}
export declare class UpdateCommandTemplateDto extends CreateCommandTemplateDto {
}
export declare class SendCommandDto {
    productionId: string;
    senderId: string;
    targetRoleId?: string;
    targetUserId?: string;
    templateId?: string;
    message: string;
    requiresAck?: boolean;
}
