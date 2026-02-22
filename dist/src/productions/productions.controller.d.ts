import { ProductionsService } from './productions.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto, GetProductionsQueryDto } from './dto/production.dto';
export declare class ProductionsController {
    private readonly productionsService;
    private readonly logger;
    constructor(productionsService: ProductionsService);
    create(req: any, dto: CreateProductionDto): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    findAll(req: any, query: GetProductionsQueryDto): Promise<{
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
                    description: string | null;
                    id: string;
                    createdAt: Date;
                    name: string;
                    updatedAt: Date;
                };
            } & {
                productionId: string;
                userId: string;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            })[];
        } & {
            description: string | null;
            id: string;
            status: import("@prisma/client").$Enums.ProductionStatus;
            createdAt: Date;
            name: string;
            updatedAt: Date;
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
    findOne(id: string, req: any): Promise<{
        vmixConnection: {
            url: string;
            productionId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isEnabled: boolean;
            pollingInterval: number;
        } | null;
        obsConnection: {
            url: string;
            productionId: string;
            id: string;
            createdAt: Date;
            password: string | null;
            updatedAt: Date;
            isEnabled: boolean;
        } | null;
        users: ({
            user: {
                id: string;
                email: string;
                name: string | null;
            };
            role: {
                description: string | null;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
            };
        } & {
            productionId: string;
            userId: string;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    update(id: string, dto: UpdateProductionDto): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
    assignUser(id: string, dto: AssignUserDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
        };
        role: {
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
        };
    } & {
        productionId: string;
        userId: string;
        roleId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeUser(id: string, userId: string): Promise<{
        productionId: string;
        userId: string;
        roleId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.ProductionStatus;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
        engineType: import("@prisma/client").$Enums.EngineType;
    }>;
}
