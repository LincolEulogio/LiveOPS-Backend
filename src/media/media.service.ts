import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AssetType } from '@prisma/client';

export interface MediaAsset {
    id: string;
    name: string;
    url: string;
    type: AssetType;
    size: number;
    mimeType: string;
    productionId: string;
    createdAt: Date;
}

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);

    constructor(private prisma: PrismaService) {}

    async getAssets(productionId: string): Promise<MediaAsset[]> {
        try {
            return await this.prisma.mediaAsset.findMany({
                where: { productionId },
                orderBy: { createdAt: 'desc' },
            });
        } catch (err) {
            this.logger.error(`Failed to fetch assets for production ${productionId}: ${err.message}`);
            return [];
        }
    }

    async saveAsset(data: {
        name: string;
        url: string;
        type: AssetType;
        size: number;
        mimeType: string;
        productionId: string;
    }) {
        try {
            return await this.prisma.mediaAsset.create({
                data,
            });
        } catch (err) {
            this.logger.error(`Failed to save asset: ${err.message}`);
            throw err;
        }
    }

    async deleteAsset(id: string, productionId: string) {
        try {
            return await this.prisma.mediaAsset.delete({
                where: { id, productionId },
            });
        } catch (err) {
            this.logger.error(`Failed to delete asset ${id}: ${err.message}`);
            throw err;
        }
    }
}
