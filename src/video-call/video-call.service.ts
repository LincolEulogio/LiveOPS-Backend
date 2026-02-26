import { Injectable, Logger } from '@nestjs/common';
import { LiveKitService } from '@/streaming/livekit.service';
import { AccessToken } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';

export interface VideoCallRoom {
    id: string;
    name: string;
    createdBy: string;
    createdAt: Date;
    participantCount: number;
}

@Injectable()
export class VideoCallService {
    private readonly logger = new Logger(VideoCallService.name);

    constructor(
        private readonly liveKitService: LiveKitService,
        private readonly configService: ConfigService,
    ) { }

    async generateJoinToken(
        roomId: string,
        identity: string,
        name: string,
        isHost: boolean = false,
    ) {
        this.logger.log(`VideoCall: generating token for ${identity} in room ${roomId}`);
        const apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || 'devkey';
        const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET') || 'secret';
        const at = new AccessToken(apiKey, apiSecret, { identity, name });
        at.addGrant({
            roomJoin: true,
            room: `vcall_${roomId}`,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            roomAdmin: isHost,
        });
        return at.toJwt();
    }

    getLiveKitUrl() {
        return this.liveKitService.getLiveKitUrl();
    }
}
