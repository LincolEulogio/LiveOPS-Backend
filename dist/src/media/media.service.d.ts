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
export declare class MediaService {
    private prisma;
    private aiService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService);
    getAssets(productionId: string): Promise<MediaAsset[]>;
    saveAsset(data: {
        name: string;
        url: string;
        type: AssetType;
        size: number;
        mimeType: string;
        productionId: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        productionId: string;
        type: import("@prisma/client").$Enums.AssetType;
        tags: string[];
        size: number;
        mimeType: string;
        aiMetadata: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    deleteAsset(id: string, productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        productionId: string;
        type: import("@prisma/client").$Enums.AssetType;
        tags: string[];
        size: number;
        mimeType: string;
        aiMetadata: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
