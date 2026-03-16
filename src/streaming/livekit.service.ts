import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || 'devkey';
    this.apiSecret =
      this.configService.get<string>('LIVEKIT_API_SECRET') || 'secret';
    this.livekitUrl =
      this.configService.get<string>('LIVEKIT_URL') || 'ws://localhost:7880';
  }

  async generateToken(
    roomId: string,
    participantIdentity: string,
    participantName: string,
    options?: {
      isOperator?: boolean;
      roomAdmin?: boolean;
    },
  ) {
    this.logger.log(
      `Generating token for participant: ${participantIdentity} in room: ${roomId}`,
    );

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: options?.roomAdmin || false,
    });

    return at.toJwt();
  }

  getLiveKitUrl() {
    return this.livekitUrl;
  }
}
