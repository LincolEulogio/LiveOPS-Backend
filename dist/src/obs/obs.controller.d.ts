import { ObsService } from './obs.service';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';
export declare class ObsController {
    private readonly obsService;
    constructor(obsService: ObsService);
    saveConnection(productionId: string, dto: SaveObsConnectionDto): Promise<{
        id: string;
        productionId: string;
        url: string;
        password: string | null;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getConnection(productionId: string): Promise<{
        id: string;
        productionId: string;
        url: string;
        password: string | null;
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
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
