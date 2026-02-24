import { ConfigService } from '@nestjs/config';
export declare class LiveKitService {
    private configService;
    private readonly logger;
    private readonly apiKey;
    private readonly apiSecret;
    private readonly livekitUrl;
    constructor(configService: ConfigService);
    generateToken(productionId: string, participantIdentity: string, participantName: string, isOperator?: boolean): Promise<string>;
    getLiveKitUrl(): string;
}
