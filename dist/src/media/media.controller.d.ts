import { MediaService } from './media.service';
export declare class MediaController {
    private mediaService;
    constructor(mediaService: MediaService);
    getAssets(): Promise<import("./media.service").MediaAsset[]>;
}
