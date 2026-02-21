import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';
export declare class ProductionsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateProductionDto): Promise<{
        description: string | null;
        id: string;
        status: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findAllForUser(userId: string): Promise<({
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
        status: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
    })[]>;
    findOne(productionId: string, userId: string): Promise<{
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
        status: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    updateState(productionId: string, dto: UpdateProductionStateDto): Promise<{
        description: string | null;
        id: string;
        status: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    assignUser(productionId: string, dto: AssignUserDto): Promise<{
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
    removeUser(productionId: string, userIdToRemove: string): Promise<{
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        roleId: string;
    }>;
}
