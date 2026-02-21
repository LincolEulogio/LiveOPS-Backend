import { ProductionsService } from './productions.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';
export declare class ProductionsController {
    private readonly productionsService;
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
    findAll(req: any): Promise<({
        users: ({
            role: {
                description: string | null;
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
            };
        } & {
            productionId: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            roleId: string;
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
    })[]>;
    findOne(id: string, req: any): Promise<{
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
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            roleId: string;
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
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        roleId: string;
    }>;
    removeUser(id: string, userId: string): Promise<{
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        roleId: string;
    }>;
}
