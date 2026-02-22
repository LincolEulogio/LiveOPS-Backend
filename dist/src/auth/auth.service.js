"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async getProfile(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                globalRole: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: { permission: { select: { action: true } } },
                        },
                    },
                },
            },
        });
    }
    async updateProfile(userId, data) {
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.password)
            updateData.password = await bcrypt.hash(data.password, 10);
        return this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                globalRole: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: { permission: { select: { action: true } } },
                        },
                    },
                },
            },
        });
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already in use');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const userCount = await this.prisma.user.count();
        let globalRoleId;
        if (userCount === 0) {
            const adminRole = await this.prisma.role.findUnique({
                where: { name: 'ADMIN' },
            });
            if (adminRole) {
                globalRoleId = adminRole.id;
            }
        }
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
                globalRoleId: globalRoleId,
            },
        });
        const tokens = await this.generateTokens(user.id);
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                globalRole: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: { permission: { select: { action: true } } },
                        },
                    },
                },
            },
        });
        return { user: fullUser, ...tokens };
    }
    async login(dto, ipAddress) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || user.deletedAt) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.auditLog
            .create({
            data: {
                userId: user.id,
                action: 'login',
                ipAddress,
            },
        })
            .catch((e) => console.error('Failed to write audit log', e));
        const tokens = await this.generateTokens(user.id);
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                globalRole: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: { permission: { select: { action: true } } },
                        },
                    },
                },
            },
        });
        return { user: fullUser, ...tokens };
    }
    async refresh(refreshToken) {
        const session = await this.prisma.session.findUnique({
            where: { refreshToken },
        });
        if (!session || session.isRevoked || session.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const tokens = await this.generateTokens(session.userId);
        await this.prisma.session.update({
            where: { id: session.id },
            data: { isRevoked: true },
        });
        return tokens;
    }
    async logout(refreshToken) {
        await this.prisma.session.updateMany({
            where: { refreshToken },
            data: { isRevoked: true },
        });
        return { success: true };
    }
    async generateTokens(userId) {
        const payload = { sub: userId };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prisma.session.create({
            data: {
                userId,
                refreshToken,
                expiresAt,
            },
        });
        return {
            accessToken,
            refreshToken,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map