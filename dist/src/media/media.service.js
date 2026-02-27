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
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let MediaService = MediaService_1 = class MediaService {
    prisma;
    aiService;
    logger = new common_1.Logger(MediaService_1.name);
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    async getAssets(productionId) {
        try {
            return await this.prisma.mediaAsset.findMany({
                where: { productionId },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch (err) {
            this.logger.error(`Failed to fetch assets for production ${productionId}: ${err.message}`);
            return [];
        }
    }
    async saveAsset(data) {
        try {
            const aiMetadata = await this.aiService.analyzeMediaAsset(data.name, data.type, data.mimeType);
            return await this.prisma.mediaAsset.create({
                data: {
                    ...data,
                    tags: aiMetadata.tags,
                    aiMetadata: aiMetadata,
                },
            });
        }
        catch (err) {
            this.logger.error(`Failed to save asset: ${err.message}`);
            return await this.prisma.mediaAsset.create({ data });
        }
    }
    async deleteAsset(id, productionId) {
        try {
            return await this.prisma.mediaAsset.delete({
                where: { id, productionId },
            });
        }
        catch (err) {
            this.logger.error(`Failed to delete asset ${id}: ${err.message}`);
            throw err;
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], MediaService);
//# sourceMappingURL=media.service.js.map