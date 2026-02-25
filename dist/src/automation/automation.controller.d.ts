import { AutomationService } from '@/automation/automation.service';
import { CreateRuleDto, UpdateRuleDto } from '@/automation/dto/automation.dto';
export declare class AutomationController {
    private readonly automationService;
    constructor(automationService: AutomationService);
    getRules(productionId: string): Promise<({
        actions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            ruleId: string;
            actionType: string;
            payload: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        triggers: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ruleId: string;
            eventType: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        isEnabled: boolean;
    })[]>;
    createRule(productionId: string, dto: CreateRuleDto): Promise<{
        actions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            ruleId: string;
            actionType: string;
            payload: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        triggers: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ruleId: string;
            eventType: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        isEnabled: boolean;
    }>;
    getRule(productionId: string, id: string): Promise<{
        actions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            ruleId: string;
            actionType: string;
            payload: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        executionLogs: {
            id: string;
            createdAt: Date;
            productionId: string;
            status: string;
            details: string | null;
            ruleId: string;
        }[];
        triggers: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ruleId: string;
            eventType: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        isEnabled: boolean;
    }>;
    updateRule(productionId: string, id: string, dto: UpdateRuleDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        isEnabled: boolean;
    }>;
    deleteRule(productionId: string, id: string): Promise<{
        success: boolean;
    }>;
    getExecutionLogs(productionId: string): Promise<({
        rule: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        productionId: string;
        status: string;
        details: string | null;
        ruleId: string;
    })[]>;
    triggerInstantClip(productionId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
