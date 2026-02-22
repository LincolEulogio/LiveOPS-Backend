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
        name: string;
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
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
        name: string;
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
    }>;
    getRule(productionId: string, id: string): Promise<{
        logs: {
            productionId: string;
            id: string;
            createdAt: Date;
            status: string;
            details: string | null;
            ruleId: string;
        }[];
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
        name: string;
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
    }>;
    updateRule(productionId: string, id: string, dto: UpdateRuleDto): Promise<{
        name: string;
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        productionId: string;
        id: string;
        createdAt: Date;
        status: string;
        details: string | null;
        ruleId: string;
    })[]>;
}
