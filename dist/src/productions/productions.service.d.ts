import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ProductionsService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(userId: string, dto: CreateProductionDto): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    findAllForUser(userId: string): Promise<({
        users: ({
            role: {
                permissions: ({
                    permission: {
                        action: string;
                        description: string | null;
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                    };
                } & {
                    roleId: string;
                    permissionId: string;
                })[];
            } & {
                description: string | null;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
            };
        } & {
            productionId: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
        })[];
    } & {
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    })[]>;
    findOne(productionId: string, userId: string): Promise<{
        vmixConnection: {
            url: string;
            productionId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isEnabled: boolean;
            pollingInterval: number;
        } | null;
        obsConnection: {
            url: string;
            productionId: string;
            id: string;
            createdAt: Date;
            password: string | null;
            updatedAt: Date;
            isEnabled: boolean;
        } | null;
        users: ({
            user: {
                id: string;
                email: string;
                name: string | null;
            };
            role: {
                description: string | null;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
            };
        } & {
            productionId: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
        })[];
    } & {
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    update(productionId: string, dto: UpdateProductionDto): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    updateState(productionId: string, dto: UpdateProductionStateDto): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    assignUser(productionId: string, dto: AssignUserDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
        };
        role: {
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
    } & {
        productionId: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
    }>;
    removeUser(productionId: string, userIdToRemove: string): Promise<{
        productionId: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
    }>;
}
