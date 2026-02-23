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
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
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
    findOne(id: string, req: any): Promise<{
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
            url: string;
            productionId: string;
            isEnabled: boolean;
        } | null;
        vmixConnection: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            url: string;
            productionId: string;
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
    update(id: string, dto: UpdateProductionDto): Promise<{
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
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
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
        deletedAt: Date | null;
        tenantId: string | null;
        description: string | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
        isRehearsal: boolean;
        publicStatusEnabled: boolean;
    }>;
}
