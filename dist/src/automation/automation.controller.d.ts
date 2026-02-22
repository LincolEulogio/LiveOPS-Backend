import { AutomationService } from './automation.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/automation.dto';
export declare class AutomationController {
    private readonly automationService;
    constructor(automationService: AutomationService);
    getRules(productionId: string): Promise<({
        triggers: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            eventType: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
            ruleId: string;
        }[];
        actions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            actionType: string;
            payload: import("@prisma/client/runtime/client").JsonValue | null;
            ruleId: string;
        }[];
    } & {
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    })[]>;
    createRule(productionId: string, dto: CreateRuleDto): Promise<{
        triggers: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            eventType: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
            ruleId: string;
        }[];
        actions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            actionType: string;
            payload: import("@prisma/client/runtime/client").JsonValue | null;
            ruleId: string;
        }[];
    } & {
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    getRule(productionId: string, id: string): Promise<{
        triggers: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            eventType: string;
            condition: import("@prisma/client/runtime/client").JsonValue | null;
            ruleId: string;
        }[];
        actions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            order: number;
            actionType: string;
            payload: import("@prisma/client/runtime/client").JsonValue | null;
            ruleId: string;
        }[];
        executionLogs: {
            id: string;
            productionId: string;
            createdAt: Date;
            status: string;
            details: string | null;
            ruleId: string;
        }[];
    } & {
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    updateRule(productionId: string, id: string, dto: UpdateRuleDto): Promise<{
        id: string;
        productionId: string;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
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
        productionId: string;
        createdAt: Date;
        status: string;
        details: string | null;
        ruleId: string;
    })[]>;
}
