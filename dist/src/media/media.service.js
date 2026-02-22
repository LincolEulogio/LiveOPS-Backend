"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("@nestjs/config");
let MediaService = MediaService_1 = class MediaService {
    configService;
    logger = new common_1.Logger(MediaService_1.name);
    assetsDir;
    constructor(configService) {
        this.configService = configService;
        this.assetsDir = this.configService.get('ASSETS_DIR') || path.join(process.cwd(), 'assets');
    }
    onModuleInit() {
        if (!fs.existsSync(this.assetsDir)) {
            this.logger.log(`Creating assets directory at ${this.assetsDir}`);
            fs.mkdirSync(this.assetsDir, { recursive: true });
        }
    }
    async getAssets() {
        try {
            const files = await fs.promises.readdir(this.assetsDir);
            const assets = [];
            for (const file of files) {
                const filePath = path.join(this.assetsDir, file);
                const stats = await fs.promises.stat(filePath);
                if (stats.isFile()) {
                    const ext = path.extname(file).toLowerCase();
                    let type = 'video';
                    if (['.mp4', '.mkv', '.mov'].includes(ext))
                        type = 'video';
                    else if (['.mp3', '.wav', '.aac'].includes(ext))
                        type = 'audio';
                    else if (['.jpg', '.png', '.gif', '.webp'].includes(ext))
                        type = 'image';
                    else
                        continue;
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
        }
        catch (err) {
            this.logger.error(`Failed to read assets directory: ${err.message}`);
            return [];
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MediaService);
//# sourceMappingURL=media.service.js.map