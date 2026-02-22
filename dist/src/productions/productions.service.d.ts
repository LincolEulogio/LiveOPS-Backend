import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from './dto/production.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class ProductionsService {
    private prisma;
    private eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(userId: string, dto: CreateProductionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
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
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    description: string | null;
                };
            } & {
                productionId: string;
                createdAt: Date;
                updatedAt: Date;
                roleId: string;
                userId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            deletedAt: Date | null;
            engineType: import("@prisma/client").$Enums.EngineType;
            status: import("@prisma/client").$Enums.ProductionStatus;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    findOne(productionId: string, userId: string): Promise<{
        obsConnection: {
            url: string;
            id: string;
            productionId: string;
            password: string | null;
            isEnabled: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        vmixConnection: {
            url: string;
            id: string;
            productionId: string;
            isEnabled: boolean;
            createdAt: Date;
            updatedAt: Date;
            pollingInterval: number;
        } | null;
        users: ({
            role: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
            user: {
                id: string;
                name: string | null;
                email: string;
            };
        } & {
            productionId: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
            userId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    update(productionId: string, dto: UpdateProductionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    updateState(productionId: string, dto: UpdateProductionStateDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    assignUser(productionId: string, dto: AssignUserDto): Promise<{
        role: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        };
        user: {
            id: string;
            name: string | null;
            email: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
}
