"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LiveKitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const livekit_server_sdk_1 = require("livekit-server-sdk");
let LiveKitService = LiveKitService_1 = class LiveKitService {
    configService;
    logger = new common_1.Logger(LiveKitService_1.name);
    apiKey;
    apiSecret;
    livekitUrl;
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('LIVEKIT_API_KEY') || 'devkey';
        this.apiSecret = this.configService.get('LIVEKIT_API_SECRET') || 'secret';
        this.livekitUrl = this.configService.get('LIVEKIT_URL') || 'ws://localhost:7880';
    }
    async generateToken(productionId, participantIdentity, participantName, isOperator = false) {
        this.logger.log(`Generating token for participant: ${participantIdentity} in room: ${productionId}`);
        const at = new livekit_server_sdk_1.AccessToken(this.apiKey, this.apiSecret, {
            identity: participantIdentity,
            name: participantName,
        });
        at.addGrant({
            roomJoin: true,
            room: productionId,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });
        return at.toJwt();
    }
    getLiveKitUrl() {
        return this.livekitUrl;
    }
};
exports.LiveKitService = LiveKitService;
exports.LiveKitService = LiveKitService = LiveKitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LiveKitService);
//# sourceMappingURL=livekit.service.js.map