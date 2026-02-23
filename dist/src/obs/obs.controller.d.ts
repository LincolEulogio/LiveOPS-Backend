import { ObsService } from './obs.service';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';
export declare class ObsController {
    private readonly obsService;
    constructor(obsService: ObsService);
    saveConnection(productionId: string, dto: SaveObsConnectionDto): Promise<{
        url: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        password: string | null;
        productionId: string;
        isEnabled: boolean;
    }>;
    getConnection(productionId: string): Promise<{
        url: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        password: string | null;
        productionId: string;
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
