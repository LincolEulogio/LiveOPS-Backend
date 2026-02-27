import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AssetType } from '@prisma/client';
import { AiService } from '@/ai/ai.service';

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

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async getAssets(productionId: string): Promise<MediaAsset[]> {
    try {
      return await this.prisma.mediaAsset.findMany({
        where: { productionId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error(
        `Failed to fetch assets for production ${productionId}: ${err.message}`,
      );
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
      // Trigger AI Analysis in parallel to not block simple save
      // but for now we'll wait for it to have tags ready on first load
      const aiMetadata = await this.aiService.analyzeMediaAsset(
        data.name,
        data.type,
        data.mimeType,
      );

      return await this.prisma.mediaAsset.create({
        data: {
          ...data,
          tags: aiMetadata.tags,
          aiMetadata: aiMetadata as any,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to save asset: ${err.message}`);
      // Fallback save without AI if it fails
      return await this.prisma.mediaAsset.create({ data });
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
