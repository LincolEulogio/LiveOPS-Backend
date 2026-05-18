import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AssetType, Prisma } from '@prisma/client';
import { AiService } from '@/ai/ai.service';
import { STORAGE_PROVIDER, StorageProvider } from './storage.provider';
import { randomUUID } from 'crypto';

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

export interface UploadSession {
  sessionId: string;
  productionId: string;
  filename: string;
  mimeType: string;
  totalSize: number;
  uploadedBytes: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  createdAt: Date;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /** In-memory upload session store. Replace with Redis for multi-instance deployments. */
  private uploadSessions = new Map<string, UploadSession>();

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    @Inject(STORAGE_PROVIDER) private storageProvider: StorageProvider,
  ) {}

  async getAssets(productionId: string): Promise<MediaAsset[]> {
    try {
      return await this.prisma.mediaAsset.findMany({
        where: { productionId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to fetch assets for production ${productionId}: ${err instanceof Error ? err.message : String(err)}`,
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
    // Save immediately without waiting for AI — never block the upload on AI availability
    const asset = await this.prisma.mediaAsset.create({ data });

    // Kick off AI tagging in background — updates the asset when done
    void this.tagAssetWithAi(asset.id, data.name, data.type, data.mimeType);

    return asset;
  }

  private async tagAssetWithAi(
    assetId: string,
    name: string,
    type: AssetType,
    mimeType: string,
  ): Promise<void> {
    try {
      const aiMetadata = await this.aiService.analyzeMediaAsset(name, type, mimeType);
      await this.prisma.mediaAsset.update({
        where: { id: assetId },
        data: {
          tags: aiMetadata.tags,
          aiMetadata: aiMetadata as Prisma.InputJsonValue,
        },
      });
      this.logger.debug(`AI tagging complete for asset ${assetId}`);
    } catch (err) {
      // AI failure is non-fatal — the asset is already saved and usable
      this.logger.warn(
        `AI tagging failed for asset ${assetId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async deleteAsset(id: string, productionId: string) {
    try {
      const asset = await this.prisma.mediaAsset.findFirst({ where: { id, productionId } });
      if (!asset) throw new NotFoundException('Asset not found');

      // Delete from storage via the abstracted provider
      void this.storageProvider.deleteFile(asset.url).catch((err: unknown) => {
        this.logger.warn(`Storage delete failed for ${asset.url}: ${err instanceof Error ? err.message : String(err)}`);
      });

      return await this.prisma.mediaAsset.delete({ where: { id } });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to delete asset ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  // ─── Chunked upload session management ──────────────────────────────────────

  /**
   * Initiates a resumable upload session.
   * The client uses the returned sessionId to track progress and resume on failure.
   */
  initiateUpload(data: {
    productionId: string;
    filename: string;
    mimeType: string;
    totalSize: number;
  }): UploadSession {
    const session: UploadSession = {
      sessionId: randomUUID(),
      ...data,
      uploadedBytes: 0,
      status: 'pending',
      createdAt: new Date(),
    };
    this.uploadSessions.set(session.sessionId, session);

    // Auto-expire after 24h
    setTimeout(() => this.uploadSessions.delete(session.sessionId), 24 * 60 * 60 * 1_000);

    this.logger.log(`Upload session initiated: ${session.sessionId} (${data.filename}, ${data.totalSize} bytes)`);
    return session;
  }

  getUploadSession(sessionId: string): UploadSession | undefined {
    return this.uploadSessions.get(sessionId);
  }

  updateUploadProgress(sessionId: string, uploadedBytes: number): UploadSession {
    const session = this.uploadSessions.get(sessionId);
    if (!session) throw new NotFoundException('Upload session not found');

    session.uploadedBytes = uploadedBytes;
    session.status = uploadedBytes >= session.totalSize ? 'complete' : 'uploading';
    return session;
  }

  async completeUpload(
    sessionId: string,
    fileUrl: string,
    type: AssetType,
  ): Promise<MediaAsset> {
    const session = this.uploadSessions.get(sessionId);
    if (!session) throw new NotFoundException('Upload session not found');

    session.status = 'complete';
    this.uploadSessions.delete(sessionId);

    return this.saveAsset({
      name: session.filename,
      url: fileUrl,
      type,
      size: session.totalSize,
      mimeType: session.mimeType,
      productionId: session.productionId,
    });
  }
}
