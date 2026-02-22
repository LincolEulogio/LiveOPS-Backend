import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

export interface MediaAsset {
    id: string;
    name: string;
    type: 'video' | 'audio' | 'image';
    path: string;
    size: number;
    extension: string;
}

@Injectable()
export class MediaService implements OnModuleInit {
    private readonly logger = new Logger(MediaService.name);
    private assetsDir: string;

    constructor(private configService: ConfigService) {
        this.assetsDir = this.configService.get<string>('ASSETS_DIR') || path.join(process.cwd(), 'assets');
    }

    onModuleInit() {
        if (!fs.existsSync(this.assetsDir)) {
            this.logger.log(`Creating assets directory at ${this.assetsDir}`);
            fs.mkdirSync(this.assetsDir, { recursive: true });
        }
    }

    async getAssets(): Promise<MediaAsset[]> {
        try {
            const files = await fs.promises.readdir(this.assetsDir);
            const assets: MediaAsset[] = [];

            for (const file of files) {
                const filePath = path.join(this.assetsDir, file);
                const stats = await fs.promises.stat(filePath);

                if (stats.isFile()) {
                    const ext = path.extname(file).toLowerCase();
                    let type: 'video' | 'audio' | 'image' = 'video';

                    if (['.mp4', '.mkv', '.mov'].includes(ext)) type = 'video';
                    else if (['.mp3', '.wav', '.aac'].includes(ext)) type = 'audio';
                    else if (['.jpg', '.png', '.gif', '.webp'].includes(ext)) type = 'image';
                    else continue; // Skip unsupported types

                    assets.push({
                        id: Buffer.from(file).toString('base64'),
                        name: file,
                        type,
                        path: filePath,
                        size: stats.size,
                        extension: ext,
                    });
                }
            }

            return assets;
        } catch (err) {
            this.logger.error(`Failed to read assets directory: ${err.message}`);
            return [];
        }
    }
}
