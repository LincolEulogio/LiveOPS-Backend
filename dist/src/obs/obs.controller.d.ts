import { ObsService } from './obs.service';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';
export declare class ObsController {
    private readonly obsService;
    constructor(obsService: ObsService);
    saveConnection(productionId: string, dto: SaveObsConnectionDto): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
        password: string | null;
        updatedAt: Date;
        url: string;
        isEnabled: boolean;
    }>;
    getConnection(productionId: string): Promise<{
        id: string;
        createdAt: Date;
        productionId: string;
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
