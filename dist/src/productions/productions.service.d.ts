import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from './dto/production.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ProductionsService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(userId: string, dto: CreateProductionDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    findAllForUser(userId: string, query: GetProductionsQueryDto): Promise<{
        data: ({
            users: ({
                role: {
                    permissions: ({
                        permission: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            description: string | null;
                            action: string;
                        };
                    } & {
                        roleId: string;
                        permissionId: string;
                    })[];
                } & {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                productionId: string;
                roleId: string;
                userId: string;
            })[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string | null;
            description: string | null;
            engineType: import("@prisma/client").$Enums.EngineType;
            status: import("@prisma/client").$Enums.ProductionStatus;
            isRehearsal: boolean;
            publicStatusEnabled: boolean;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    findOne(productionId: string, userId: string): Promise<{
        users: ({
            user: {
                id: string;
                email: string;
                name: string | null;
            };
            role: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            productionId: string;
            roleId: string;
            userId: string;
        })[];
        obsConnection: {
            id: string;
            password: string | null;
            createdAt: Date;
            updatedAt: Date;
            productionId: string;
            url: string;
            isEnabled: boolean;
        } | null;
        vmixConnection: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productionId: string;
            url: string;
            isEnabled: boolean;
            pollingInterval: number;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    update(productionId: string, dto: UpdateProductionDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    updateState(productionId: string, dto: UpdateProductionStateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    assignUser(productionId: string, dto: AssignUserDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
        };
        role: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        roleId: string;
        userId: string;
    }>;
    removeUser(productionId: string, userIdToRemove: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        roleId: string;
        userId: string;
    }>;
    remove(productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    toggleRehearsal(productionId: string, enabled: boolean): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
}
