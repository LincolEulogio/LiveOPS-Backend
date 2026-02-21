import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';
export declare class ProductionsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateProductionDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
    }>;
    findAllForUser(userId: string): Promise<({
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
    findOne(productionId: string, userId: string): Promise<{
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
    updateState(productionId: string, dto: UpdateProductionStateDto): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        status: string;
    }>;
    assignUser(productionId: string, dto: AssignUserDto): Promise<{
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
    removeUser(productionId: string, userIdToRemove: string): Promise<{
        productionId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        roleId: string;
    }>;
}
