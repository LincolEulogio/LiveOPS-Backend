import { AutomationService } from './automation.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/automation.dto';
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
            eventType: string;
            updatedAt: Date;
            ruleId: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
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
            eventType: string;
            updatedAt: Date;
            ruleId: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
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
            details: string | null;
            status: string;
            ruleId: string;
        }[];
        triggers: {
            id: string;
            createdAt: Date;
            eventType: string;
            updatedAt: Date;
            ruleId: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
        isEnabled: boolean;
    }>;
    updateRule(productionId: string, id: string, dto: UpdateRuleDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        productionId: string;
        updatedAt: Date;
        description: string | null;
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
        details: string | null;
        status: string;
        ruleId: string;
    })[]>;
    triggerInstantClip(productionId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
