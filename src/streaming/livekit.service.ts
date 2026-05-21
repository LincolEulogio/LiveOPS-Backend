import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  RoomServiceClient,
  StreamOutput,
  StreamProtocol,
} from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitInternalUrl: string;
  private readonly livekitPublicUrl: string;
  private readonly defaultLayout: string;
  private readonly egressClient: EgressClient;
  private readonly roomClient: RoomServiceClient;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY') ?? 'devkey';
    this.apiSecret =
      this.configService.get<string>('LIVEKIT_API_SECRET') ?? 'secret';
    this.livekitInternalUrl =
      this.configService.get<string>('LIVEKIT_INTERNAL_URL') ??
      this.configService.get<string>('LIVEKIT_URL') ??
      'ws://localhost:7880';
    this.livekitPublicUrl =
      this.configService.get<string>('LIVEKIT_PUBLIC_URL') ??
      this.configService.get<string>('LIVEKIT_URL') ??
      this.livekitInternalUrl;

    this.defaultLayout =
      this.configService.get<string>('LIVEKIT_DEFAULT_LAYOUT') ?? 'speaker-dark';

    if (this.apiKey === 'devkey' || this.apiSecret === 'secret') {
      this.logger.warn(
        'LiveKit is using default development credentials. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in production.',
      );
    }

    const httpUrl = this.livekitInternalUrl.replace(/^wss?/, 'http');

    this.egressClient = new EgressClient(httpUrl, this.apiKey, this.apiSecret);
    this.roomClient = new RoomServiceClient(
      httpUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  async ensureRoomExists(roomId: string): Promise<void> {
    try {
      await this.roomClient.createRoom({
        name: roomId,
        emptyTimeout: 10 * 60,
        maxParticipants: 50,
      });
      this.logger.log(`Room ${roomId} created or verified.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      // LiveKit returns AlreadyExists when the room is already open — that's fine.
      if (msg.includes('already exists') || msg.includes('AlreadyExists')) {
        this.logger.debug(`Room ${roomId} already exists, continuing.`);
        return;
      }
      this.logger.error(`Failed to ensure room ${roomId}: ${msg}`);
      throw error;
    }
  }

  async generateToken(
    roomId: string,
    participantIdentity: string,
    participantName: string,
    options?: {
      isOperator?: boolean;
      roomAdmin?: boolean;
      canPublish?: boolean;
      canSubscribe?: boolean;
      canPublishData?: boolean;
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
      canPublish: options?.canPublish ?? true,
      canSubscribe: options?.canSubscribe ?? true,
      canPublishData: options?.canPublishData ?? true,
      roomAdmin: options?.roomAdmin ?? false,
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

    const info = await this.egressClient.startRoomCompositeEgress(
      roomId,
      output,
      { layout: layout || this.defaultLayout },
    );

    return info;
  }

  /**
   * Starts a room composite egress to a file (MP4).
   */
  async startRoomCompositeRecording(roomId: string, layout?: string) {
    this.logger.log(
      `Starting Room Composite Recording for room ${roomId} with layout: ${layout || 'default'}`,
    );

    // Note: This requires LiveKit Egress to be configured with a storage provider (S3, GCS, etc.)
    // or a local directory. For now we use a timestamped filename.
    const filename = `recording_${roomId}_${Date.now()}.mp4`;

    const output = new EncodedFileOutput({
      filepath: filename,
    });

    const info = await this.egressClient.startRoomCompositeEgress(
      roomId,
      output,
      { layout: layout || this.defaultLayout },
    );

    return info;
  }

  async stopEgress(egressId: string) {
    this.logger.log(`Stopping egress ${egressId}`);
    return await this.egressClient.stopEgress(egressId);
  }

  getLiveKitUrl() {
    return this.livekitPublicUrl;
  }
}
