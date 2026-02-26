import { ObsService } from '@/obs/obs.service';
import { SaveObsConnectionDto, ChangeSceneDto } from '@/obs/dto/obs.dto';
export declare class ObsController {
    private readonly obsService;
    constructor(obsService: ObsService);
    saveConnection(productionId: string, dto: SaveObsConnectionDto): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        password: string | null;
        updatedAt: Date;
        url: string;
        isEnabled: boolean;
    }>;
    getConnection(productionId: string): Promise<{
        id: string;
        productionId: string;
        createdAt: Date;
        password: string | null;
        updatedAt: Date;
        url: string;
        isEnabled: boolean;
    }>;
    changeScene(productionId: string, dto: ChangeSceneDto): Promise<{
        success: boolean;
        sceneName: string;
    }>;
    startStream(productionId: string): Promise<{
        success: boolean;
    }>;
    stopStream(productionId: string): Promise<{
        success: boolean;
    }>;
}
