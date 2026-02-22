import { ProductionsService } from './productions.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from './dto/production.dto';
export declare class ProductionsController {
    private readonly productionsService;
    private readonly logger;
    constructor(productionsService: ProductionsService);
    create(req: any, dto: CreateProductionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
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
    findOne(id: string, req: any): Promise<{
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
    update(id: string, dto: UpdateProductionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
        status: import("@prisma/client").$Enums.ProductionStatus;
    }>;
    assignUser(id: string, dto: AssignUserDto): Promise<{
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
    removeUser(id: string, userId: string): Promise<{
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        userId: string;
    }>;
    remove(id: string): Promise<{
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
