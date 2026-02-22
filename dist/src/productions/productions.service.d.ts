import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from './dto/production.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ProductionsService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(userId: string, dto: CreateProductionDto): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    findAllForUser(userId: string, query: GetProductionsQueryDto): Promise<{
        data: ({
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
                    name: string;
                    description: string | null;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                productionId: string;
                createdAt: Date;
                updatedAt: Date;
                roleId: string;
                userId: string;
            })[];
        } & {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ProductionStatus;
            deletedAt: Date | null;
            engineType: import("@prisma/client").$Enums.EngineType;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    findOne(productionId: string, userId: string): Promise<{
        vmixConnection: {
            productionId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isEnabled: boolean;
            pollingInterval: number;
            url: string;
        } | null;
        obsConnection: {
            productionId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            password: string | null;
            isEnabled: boolean;
            url: string;
        } | null;
        users: ({
            user: {
                name: string | null;
                id: string;
                email: string;
            };
            role: {
                name: string;
                description: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            productionId: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
            userId: string;
        })[];
    } & {
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    update(productionId: string, dto: UpdateProductionDto): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    updateState(productionId: string, dto: UpdateProductionStateDto): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    assignUser(productionId: string, dto: AssignUserDto): Promise<{
        user: {
            name: string | null;
            id: string;
            email: string;
        };
        role: {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        userId: string;
    }>;
    removeUser(productionId: string, userIdToRemove: string): Promise<{
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        userId: string;
    }>;
    remove(productionId: string): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ProductionStatus;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
}
