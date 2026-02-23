import { ProductionsService } from './productions.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from './dto/production.dto';
export declare class ProductionsController {
    private readonly productionsService;
    private readonly logger;
    constructor(productionsService: ProductionsService);
    create(req: any, dto: CreateProductionDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        deletedAt: Date | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    findAll(req: any, query: GetProductionsQueryDto): Promise<{
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
            tenantId: string | null;
            deletedAt: Date | null;
            description: string | null;
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
    findOne(id: string, req: any): Promise<{
        users: ({
            role: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
            };
            user: {
                id: string;
                name: string | null;
                email: string;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            productionId: string;
            roleId: string;
            userId: string;
        })[];
        obsConnection: {
            url: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            password: string | null;
            productionId: string;
            isEnabled: boolean;
        } | null;
        vmixConnection: {
            url: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productionId: string;
            isEnabled: boolean;
            pollingInterval: number;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        deletedAt: Date | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    update(id: string, dto: UpdateProductionDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        deletedAt: Date | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        deletedAt: Date | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    assignUser(id: string, dto: AssignUserDto): Promise<{
        role: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        };
        user: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        roleId: string;
        userId: string;
    }>;
    removeUser(id: string, userId: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        productionId: string;
        roleId: string;
        userId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        deletedAt: Date | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
}
