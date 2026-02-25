import { Request } from 'express';
import { ProductionsService } from '@/productions/productions.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from '@/productions/dto/production.dto';
interface RequestWithUser extends Request {
    user: {
        userId: string;
        tenantId: string;
    };
}
export declare class ProductionsController {
    private readonly productionsService;
    private readonly logger;
    constructor(productionsService: ProductionsService);
    create(req: RequestWithUser, dto: CreateProductionDto): Promise<{
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
    findAll(req: RequestWithUser, query: GetProductionsQueryDto): Promise<{
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
    findOne(id: string, req: RequestWithUser): Promise<{
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
    update(id: string, dto: UpdateProductionDto): Promise<{
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
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
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
    assignUser(id: string, dto: AssignUserDto): Promise<{
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
    removeUser(id: string, userId: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        productionId: string;
        userId: string;
    }>;
    remove(id: string): Promise<{
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
export {};
