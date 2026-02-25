import { Request } from 'express';
import { ProductionsService } from './productions.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from './dto/production.dto';
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
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
        tenantId: string | null;
    }>;
    findAll(req: RequestWithUser, query: GetProductionsQueryDto): Promise<{
        data: ({
            users: ({
                role: {
                    permissions: ({
                        permission: {
                            action: string;
                            id: string;
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
                    name: string;
                    description: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                roleId: string;
                productionId: string;
            })[];
        } & {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            engineType: import("@prisma/client").$Enums.EngineType;
            status: import("@prisma/client").$Enums.ProductionStatus;
            isRehearsal: boolean;
            publicStatusEnabled: boolean;
            tenantId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    findOne(id: string, req: RequestWithUser): Promise<{
        obsConnection: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            password: string | null;
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
        users: ({
            role: {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
            user: {
                id: string;
                name: string | null;
                email: string;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            roleId: string;
            productionId: string;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
        tenantId: string | null;
    }>;
    update(id: string, dto: UpdateProductionDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
        tenantId: string | null;
    }>;
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
        tenantId: string | null;
    }>;
    assignUser(id: string, dto: AssignUserDto): Promise<{
        role: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        user: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        roleId: string;
        productionId: string;
    }>;
    removeUser(id: string, userId: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        roleId: string;
        productionId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
        tenantId: string | null;
    }>;
}
export {};
