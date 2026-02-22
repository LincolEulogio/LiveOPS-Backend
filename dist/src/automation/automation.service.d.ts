import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/automation.dto';
export declare class AutomationService {
    private prisma;
    constructor(prisma: PrismaService);
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
        productionId: string;
        name: string;
        description: string | null;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getRule(id: string, productionId: string): Promise<{
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
            productionId: string;
            createdAt: Date;
            ruleId: string;
            status: string;
            details: string | null;
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
        productionId: string;
        name: string;
        description: string | null;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
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
        productionId: string;
        name: string;
        description: string | null;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRule(id: string, productionId: string, dto: UpdateRuleDto): Promise<{
        id: string;
        productionId: string;
        name: string;
        description: string | null;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteRule(id: string, productionId: string): Promise<{
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
        ruleId: string;
        status: string;
        details: string | null;
    })[]>;
}
