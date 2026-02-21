import { PrismaService } from '../prisma/prisma.service';
import { ObsConnectionManager } from './obs-connection.manager';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';
export declare class ObsService {
    private prisma;
    private obsManager;
    private readonly logger;
    constructor(prisma: PrismaService, obsManager: ObsConnectionManager);
    saveConnection(productionId: string, dto: SaveObsConnectionDto): Promise<{
        url: string;
        productionId: string;
        id: string;
        createdAt: Date;
        password: string | null;
        updatedAt: Date;
        isEnabled: boolean;
    }>;
    getConnection(productionId: string): Promise<{
        url: string;
        productionId: string;
        id: string;
        createdAt: Date;
        password: string | null;
        updatedAt: Date;
        isEnabled: boolean;
    }>;
    private getObs;
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
