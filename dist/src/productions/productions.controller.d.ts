import { ProductionsService } from './productions.service';
import { CreateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';
export declare class ProductionsController {
    private readonly productionsService;
    constructor(productionsService: ProductionsService);
    create(req: any, dto: CreateProductionDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
    }>;
    findAll(req: any): Promise<({
        users: ({
            role: {
                description: string | null;
                name: string;
                id: string;
                createdAt: Date;
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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
    })[]>;
    findOne(id: string, req: any): Promise<{
        users: ({
            user: {
                email: string;
                name: string | null;
                id: string;
            };
            role: {
                description: string | null;
                name: string;
                id: string;
                createdAt: Date;
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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
    }>;
    updateState(id: string, dto: UpdateProductionStateDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
    }>;
    assignUser(id: string, dto: AssignUserDto): Promise<{
        user: {
            email: string;
            name: string | null;
            id: string;
        };
        role: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
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
