"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const production_dto_1 = require("./dto/production.dto");
const event_emitter_1 = require("@nestjs/event-emitter");
let ProductionsService = class ProductionsService {
    prisma;
    eventEmitter;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async create(userId, dto) {
        let adminRole = await this.prisma.role.findUnique({ where: { name: 'ADMIN' } });
        if (!adminRole) {
            adminRole = await this.prisma.role.create({ data: { name: 'ADMIN', description: 'Production Administrator' } });
        }
        const production = await this.prisma.production.create({
            data: {
                name: dto.name,
                description: dto.description,
                status: dto.status || 'DRAFT',
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
    async findAllForUser(userId) {
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
    async findOne(productionId, userId) {
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
                },
                obsConnection: true,
                vmixConnection: true
            }
        });
        if (!prod)
            throw new common_1.NotFoundException('Production not found or access denied');
        return prod;
    }
    async update(productionId, dto) {
        const { obsConfig, vmixConfig, ...basicData } = dto;
        return this.prisma.$transaction(async (tx) => {
            const production = await tx.production.update({
                where: { id: productionId },
                data: basicData
            });
            if (obsConfig) {
                let host = obsConfig.host || '127.0.0.1';
                if (host.includes(':') && !host.startsWith('[') && !host.endsWith(']')) {
                    host = `[${host}]`;
                }
                const url = `ws://${host}:${obsConfig.port || '4455'}`;
                await tx.obsConnection.upsert({
                    where: { productionId },
                    create: {
                        productionId,
                        url,
                        password: obsConfig.password,
                        isEnabled: obsConfig.isEnabled ?? true
                    },
                    update: {
                        url,
                        password: obsConfig.password,
                        isEnabled: obsConfig.isEnabled
                    }
                });
                this.eventEmitter.emit('engine.connection.update', {
                    productionId,
                    type: production_dto_1.EngineType.OBS,
                    url,
                    password: obsConfig.password
                });
            }
            if (vmixConfig) {
                let host = vmixConfig.host || '127.0.0.1';
                if (host.includes(':') && !host.startsWith('[') && !host.endsWith(']')) {
                    host = `[${host}]`;
                }
                const url = `http://${host}:${vmixConfig.port || '8088'}`;
                await tx.vmixConnection.upsert({
                    where: { productionId },
                    create: {
                        productionId,
                        url,
                        isEnabled: vmixConfig.isEnabled ?? true,
                        pollingInterval: vmixConfig.pollingInterval ?? 500
                    },
                    update: {
                        url,
                        isEnabled: vmixConfig.isEnabled,
                        pollingInterval: vmixConfig.pollingInterval
                    }
                });
                this.eventEmitter.emit('engine.connection.update', {
                    productionId,
                    type: production_dto_1.EngineType.VMIX,
                    url,
                    pollingInterval: vmixConfig.pollingInterval
                });
            }
            return production;
        });
    }
    async updateState(productionId, dto) {
        return this.prisma.production.update({
            where: { id: productionId },
            data: { status: dto.status }
        });
    }
    async assignUser(productionId, dto) {
        const userToAssign = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!userToAssign)
            throw new common_1.NotFoundException('User with this email not found');
        const roleToAssign = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
        if (!roleToAssign)
            throw new common_1.NotFoundException('Role not found');
        const existing = await this.prisma.productionUser.findUnique({
            where: {
                userId_productionId: {
                    userId: userToAssign.id,
                    productionId
                }
            }
        });
        if (existing)
            throw new common_1.ConflictException('User is already in this production');
        const result = await this.prisma.productionUser.create({
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
        this.eventEmitter.emit('production.user.assigned', {
            productionId,
            userId: userToAssign.id,
            userEmail: userToAssign.email,
            roleName: roleToAssign.name
        });
        return result;
    }
    async removeUser(productionId, userIdToRemove) {
        const result = await this.prisma.productionUser.delete({
            where: {
                userId_productionId: {
                    userId: userIdToRemove,
                    productionId
                }
            }
        });
        this.eventEmitter.emit('production.user.removed', {
            productionId,
            userId: userIdToRemove
        });
        return result;
    }
};
exports.ProductionsService = ProductionsService;
exports.ProductionsService = ProductionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], ProductionsService);
//# sourceMappingURL=productions.service.js.map