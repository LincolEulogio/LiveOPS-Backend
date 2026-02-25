import { MediaService } from '@/media/media.service';
export declare class MediaController {
    private mediaService;
    constructor(mediaService: MediaService);
    getAssets(): Promise<import("@/media/media.service").MediaAsset[]>;
}
