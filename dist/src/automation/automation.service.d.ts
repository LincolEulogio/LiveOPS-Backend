import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/automation.dto';
export declare class AutomationService {
    private prisma;
    constructor(prisma: PrismaService);
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
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        isEnabled: boolean;
    })[]>;
    getRule(id: string, productionId: string): Promise<{
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
            createdAt: Date;
            productionId: string;
            status: string;
            details: string | null;
            ruleId: string;
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
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        isEnabled: boolean;
    }>;
    updateRule(id: string, productionId: string, dto: UpdateRuleDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        productionId: string;
        isEnabled: boolean;
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
        createdAt: Date;
        productionId: string;
        status: string;
        details: string | null;
        ruleId: string;
    })[]>;
}
