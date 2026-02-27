import { PrismaService } from '@/prisma/prisma.service';
import { CreateRuleDto, UpdateRuleDto } from '@/automation/dto/automation.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class AutomationService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
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
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
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
            status: string;
            productionId: string;
            details: string | null;
            ruleId: string;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
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
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        productionId: string;
        isEnabled: boolean;
    }>;
    updateRule(id: string, productionId: string, dto: UpdateRuleDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
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
        status: string;
        productionId: string;
        details: string | null;
        ruleId: string;
    })[]>;
    triggerInstantClip(productionId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    runRuleManual(productionId: string, ruleId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
