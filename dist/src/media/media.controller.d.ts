import { MediaService } from '@/media/media.service';
import { AssetType } from '@prisma/client';
declare class SaveAssetDto {
    name: string;
    url: string;
    type: AssetType;
    size: number;
    mimeType: string;
}
export declare class MediaController {
    private mediaService;
    constructor(mediaService: MediaService);
    getAssets(productionId: string): Promise<import("@/media/media.service").MediaAsset[]>;
    saveAsset(productionId: string, body: SaveAssetDto): Promise<{
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
    deleteAsset(productionId: string, id: string): Promise<{
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
export {};
