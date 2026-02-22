import { SocialService, SocialComment } from './social.service';
export declare class SocialController {
    private socialService;
    constructor(socialService: SocialService);
    mockComment(productionId: string, comment: SocialComment): Promise<void>;
    setOverlay(productionId: string, comment: SocialComment | null): Promise<void>;
    getActiveOverlay(productionId: string): Promise<SocialComment | null>;
}
