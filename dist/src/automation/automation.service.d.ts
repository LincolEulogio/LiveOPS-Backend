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
        name: string;
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
    })[]>;
    getRule(id: string, productionId: string): Promise<{
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
    updateRule(id: string, productionId: string, dto: UpdateRuleDto): Promise<{
        name: string;
        description: string | null;
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        productionId: string;
        id: string;
        createdAt: Date;
        status: string;
        details: string | null;
        ruleId: string;
    })[]>;
}
