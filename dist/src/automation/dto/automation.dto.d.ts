export declare class CreateTriggerDto {
    eventType: string;
    condition?: any;
}
export declare class CreateActionDto {
    actionType: string;
    payload?: any;
    order?: number;
}
export declare class CreateRuleDto {
    name: string;
    description?: string;
    isEnabled?: boolean;
    triggers: CreateTriggerDto[];
    actions: CreateActionDto[];
}
export declare class UpdateRuleDto {
    name?: string;
    description?: string;
    isEnabled?: boolean;
}
