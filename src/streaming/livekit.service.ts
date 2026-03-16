import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  EgressClient,
  StreamOutput,
  StreamProtocol,
} from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitUrl: string;
  private readonly egressClient: EgressClient;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || 'devkey';
    this.apiSecret =
      this.configService.get<string>('LIVEKIT_API_SECRET') || 'secret';
    this.livekitUrl =
      this.configService.get<string>('LIVEKIT_URL') || 'ws://localhost:7880';

    // Initialize EgressClient
    this.egressClient = new EgressClient(
      this.livekitUrl,
      this.apiKey,
      this.apiSecret,
    );
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

  /**
   * Starts a room composite egress to multiple RTMP destinations.
   */
  async startRoomCompositeEgress(
    roomId: string,
    rtmpUrls: string[],
    layout?: string,
  ) {
    this.logger.log(
      `Starting Room Composite Egress for room ${roomId} to ${rtmpUrls.length} destinations with layout: ${layout || 'default'}`,
    );

    const output = new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: rtmpUrls,
    });

    // We use a predefined template for the mixer or a simple room composite
    // Note: In a real environment, you might want to specify a custom layout URL
    const info = await this.egressClient.startRoomCompositeEgress(
      roomId,
      output,
      layout || 'speaker-dark', // Default layout for the cloud mixer
    );

    return info;
  }

  async stopEgress(egressId: string) {
    this.logger.log(`Stopping egress ${egressId}`);
    return await this.egressClient.stopEgress(egressId);
  }

  getLiveKitUrl() {
    return this.livekitUrl;
  }
}
