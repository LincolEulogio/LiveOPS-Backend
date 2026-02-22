import { ObsService } from './obs.service';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';
export declare class ObsController {
    private readonly obsService;
    constructor(obsService: ObsService);
    saveConnection(productionId: string, dto: SaveObsConnectionDto): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        password: string | null;
        isEnabled: boolean;
        url: string;
    }>;
    getConnection(productionId: string): Promise<{
        productionId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        password: string | null;
        isEnabled: boolean;
        url: string;
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
