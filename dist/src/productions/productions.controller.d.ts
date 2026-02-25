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
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.ProductionStatus;
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
                roleId: string;
                userId: string;
                productionId: string;
            })[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            tenantId: string | null;
            description: string | null;
            status: import("@prisma/client").$Enums.ProductionStatus;
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
            roleId: string;
            userId: string;
            productionId: string;
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
        status: import("@prisma/client").$Enums.ProductionStatus;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    update(id: string, dto: UpdateProductionDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.ProductionStatus;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.ProductionStatus;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
    assignUser(id: string, dto: AssignUserDto): Promise<{
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
        roleId: string;
        userId: string;
        productionId: string;
    }>;
    removeUser(id: string, userId: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        userId: string;
        productionId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        status: import("@prisma/client").$Enums.ProductionStatus;
        engineType: import("@prisma/client").$Enums.EngineType;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
}
export {};
