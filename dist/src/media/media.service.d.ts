import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface MediaAsset {
    id: string;
    name: string;
    type: 'video' | 'audio' | 'image';
    path: string;
    size: number;
    extension: string;
}
export declare class MediaService implements OnModuleInit {
    private configService;
    private readonly logger;
    private assetsDir;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    getAssets(): Promise<MediaAsset[]>;
}
