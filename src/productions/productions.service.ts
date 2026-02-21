import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';

@Injectable()
export class ProductionsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateProductionDto) {
        // We assume the creator gets an 'ADMIN' role in this production
        // First, find or ensure the 'ADMIN' role exists
        let adminRole = await this.prisma.role.findUnique({ where: { name: 'ADMIN' } });
        if (!adminRole) {
            adminRole = await this.prisma.role.create({ data: { name: 'ADMIN', description: 'Production Administrator' } });
        }

        const production = await this.prisma.production.create({
            data: {
                name: dto.name,
                description: dto.description,
                status: 'DRAFT',
                engineType: dto.engineType || 'OBS',
                users: {
                    create: {
                        userId,
                        roleId: adminRole.id,
                    }
                }
            }
        });

        return production;
    }

    async findAllForUser(userId: string) {
        return this.prisma.production.findMany({
            where: {
                deletedAt: null,
                users: {
                    some: { userId }
                }
            },
            include: {
                users: {
                    where: { userId },
                    include: { role: true }
                }
            }
        });
    }

    async findOne(productionId: string, userId: string) {
        const prod = await this.prisma.production.findFirst({
            where: {
                id: productionId,
                deletedAt: null,
                users: { some: { userId } }
            },
            include: {
                users: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                        role: true
                    }
                }
            }
        });

        if (!prod) throw new NotFoundException('Production not found or access denied');
        return prod;
    }

    async update(productionId: string, dto: UpdateProductionDto) {
        return this.prisma.production.update({
            where: { id: productionId },
            data: {
                name: dto.name,
                description: dto.description,
                engineType: dto.engineType,
                status: dto.status
            }
        });
    }

    async updateState(productionId: string, dto: UpdateProductionStateDto) {
        return this.prisma.production.update({
            where: { id: productionId },
            data: { status: dto.status }
        });
    }

    async assignUser(productionId: string, dto: AssignUserDto) {
        const userToAssign = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!userToAssign) throw new NotFoundException('User with this email not found');

        const roleToAssign = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
        if (!roleToAssign) throw new NotFoundException('Role not found');

        // Check if already assigned
        const existing = await this.prisma.productionUser.findUnique({
            where: {
                userId_productionId: {
                    userId: userToAssign.id,
                    productionId
                }
            }
        });

        if (existing) throw new ConflictException('User is already in this production');

        return this.prisma.productionUser.create({
            data: {
                userId: userToAssign.id,
                productionId,
                roleId: roleToAssign.id
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                role: true
            }
        });
    }

    async removeUser(productionId: string, userIdToRemove: string) {
        return this.prisma.productionUser.delete({
            where: {
                userId_productionId: {
                    userId: userIdToRemove,
                    productionId
                }
            }
        });
    }
}
