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
export declare class MediaService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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
        size: number;
        mimeType: string;
    }>;
    deleteAsset(id: string, productionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        productionId: string;
        type: import("@prisma/client").$Enums.AssetType;
        size: number;
        mimeType: string;
    }>;
}
