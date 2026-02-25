import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from '@/productions/dto/production.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ProductionsService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(userId: string, dto: CreateProductionDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        tenantId: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
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
                            action: string;
                            description: string | null;
                            createdAt: Date;
                            updatedAt: Date;
                        };
                    } & {
                        roleId: string;
                        permissionId: string;
                    })[];
                } & {
                    id: string;
                    description: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                roleId: string;
                productionId: string;
                userId: string;
            })[];
        } & {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: import("@prisma/client").$Enums.ProductionStatus;
            deletedAt: Date | null;
            tenantId: string | null;
            engineType: import("@prisma/client").$Enums.EngineType;
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
            role: {
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
            user: {
                id: string;
                name: string | null;
                email: string;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
            productionId: string;
            userId: string;
        })[];
        obsConnection: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productionId: string;
            password: string | null;
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
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        tenantId: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    update(productionId: string, dto: UpdateProductionDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        tenantId: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    updateState(productionId: string, dto: UpdateProductionStateDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        tenantId: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    assignUser(productionId: string, dto: AssignUserDto): Promise<{
        role: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
        user: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        productionId: string;
        userId: string;
    }>;
    removeUser(productionId: string, userIdToRemove: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        productionId: string;
        userId: string;
    }>;
    remove(productionId: string): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        tenantId: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    toggleRehearsal(productionId: string, enabled: boolean): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        tenantId: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
}
