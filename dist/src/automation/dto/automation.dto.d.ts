export type JsonValue = string | number | boolean | null | {
    [key: string]: JsonValue;
} | JsonValue[];
export declare class CreateTriggerDto {
    eventType: string;
    condition?: JsonValue;
}
export declare class CreateActionDto {
    actionType: string;
    payload?: JsonValue;
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
