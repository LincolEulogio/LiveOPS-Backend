import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { SocialService } from '@/social/social.service';
import { WebSocket, RawData } from 'ws';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface RestreamTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function fetchRestreamToken(
  params: Record<string, string>,
): Promise<RestreamTokenResponse | null> {
  try {
    const res = await fetch('https://api.restream.io/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    if (!res.ok) return null;
    return (await res.json()) as RestreamTokenResponse;
  } catch {
    return null;
  }
}

const PLATFORM_MAP: Record<string, string> = {
  youtube: 'youtube',
  facebook: 'facebook',
  twitch: 'twitch',
  tiktok: 'tiktok',
  instagram: 'instagram',
  twitter: 'twitter',
  linkedin: 'linkedin',
  kick: 'kick',
  trovo: 'trovo',
};

interface RestreamChatEvent {
  action: string;
  payload?: any; // Keep as any inside the interface for flexibility but cast safely in code
}

interface RestreamMessagePayload {
  text?: string;
  id?: string;
  platform?: string;
  author?: {
    displayName?: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
    avatar?: string;
  };
  eventPayload?: RestreamMessagePayload; // For 'event' action
  connectionIdentifier?: string;
}

interface RestreamConnectionInfo {
  viewers?: number;
  [key: string]: any;
}

@Injectable()
export class RestreamChatService implements OnModuleDestroy {
  private readonly logger = new Logger(RestreamChatService.name);
  private connections = new Map<string, WebSocket>();
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();
  private refreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly socialService: SocialService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleDestroy() {
    for (const [productionId] of this.connections) {
      this.disconnect(productionId);
    }
  }

  async connectProduction(productionId: string): Promise<void> {
    if (this.connections.has(productionId)) return;

    const conn = await this.prisma.restreamConnection.findUnique({
      where: { productionId },
    });

    if (!conn) {
      this.logger.warn(`No Restream connection for production ${productionId}`);
      return;
    }

    if (new Date() >= conn.expiresAt) {
      await this.refreshAccessToken(productionId, conn.refreshToken);
      const updated = await this.prisma.restreamConnection.findUnique({
        where: { productionId },
      });
      if (!updated) return;
      this.openWebSocket(productionId, updated.accessToken);
    } else {
      this.openWebSocket(productionId, conn.accessToken);
    }
  }

  disconnect(productionId: string): void {
    const ws = this.connections.get(productionId);
    if (ws) {
      ws.close();
      this.connections.delete(productionId);
    }
    const ht = this.heartbeatTimers.get(productionId);
    if (ht) {
      clearTimeout(ht);
      this.heartbeatTimers.delete(productionId);
    }
    const rt = this.refreshTimers.get(productionId);
    if (rt) {
      clearTimeout(rt);
      this.refreshTimers.delete(productionId);
    }
  }

  isConnected(productionId: string): boolean {
    const ws = this.connections.get(productionId);
    return !!ws && ws.readyState === WebSocket.OPEN;
  }

  private openWebSocket(productionId: string, accessToken: string): void {
    const url = `wss://chat.api.restream.io/ws?accessToken=${accessToken}`;
    const ws = new WebSocket(url);

    this.connections.set(productionId, ws);
    this.resetHeartbeatTimer(productionId, ws);

    ws.on('open', () => {
      this.logger.log(`Restream chat connected for production ${productionId}`);
    });

    ws.on('message', (raw: RawData) => {
      this.resetHeartbeatTimer(productionId, ws);
      try {
        let messageString: string;
        if (typeof raw === 'string') {
          messageString = raw;
        } else if (Buffer.isBuffer(raw)) {
          messageString = raw.toString('utf-8');
        } else if (raw instanceof ArrayBuffer) {
          messageString = Buffer.from(raw).toString('utf-8');
        } else {
          messageString = Buffer.concat(raw as Buffer[]).toString('utf-8');
        }

        const data = JSON.parse(messageString) as RestreamChatEvent;
        void this.handleEvent(productionId, data).catch((e: unknown) => {
          this.logger.error(
            `Error handling Restream event for ${productionId}: ${e instanceof Error ? e.message : String(e)}`,
          );
        });
      } catch (err) {
        this.logger.error(`Malformed Restream frame ignored: ${err}`);
      }
    });

    ws.on('close', (code: number) => {
      this.logger.warn(
        `Restream chat disconnected for production ${productionId} (code ${code})`,
      );
      this.connections.delete(productionId);
      this.heartbeatTimers.delete(productionId);
      setTimeout(() => void this.connectProduction(productionId), 5000);
    });

    ws.on('error', (err: Error) => {
      this.logger.error(
        `Restream WS error for production ${productionId}: ${err.message}`,
      );
    });
  }

  private resetHeartbeatTimer(productionId: string, ws: WebSocket): void {
    const existing = this.heartbeatTimers.get(productionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.logger.warn(
        `Restream heartbeat timeout for production ${productionId}, reconnecting`,
      );
      ws.terminate();
    }, 65_000);

    this.heartbeatTimers.set(productionId, timer);
  }

  private async handleEvent(
    productionId: string,
    data: RestreamChatEvent,
  ): Promise<void> {
    const action = data.action;

    if (action === 'connection_info' || action === 'viewers_count') {
      let totalViewers = 0;
      if (action === 'connection_info' && Array.isArray(data.payload)) {
        const connections = data.payload as RestreamConnectionInfo[];
        totalViewers = connections.reduce(
          (acc, conn) => acc + (conn.viewers || 0),
          0,
        );
      } else if (action === 'viewers_count' && data.payload) {
        const vPayload = data.payload as { viewers?: number };
        if (typeof vPayload.viewers === 'number') {
          totalViewers = vPayload.viewers;
        }
      }

      this.eventEmitter.emit('social.viewers_update', {
        productionId,
        viewers: totalViewers,
      });
      return;
    }

    let payload: RestreamMessagePayload | undefined;
    if (action === 'message') {
      payload = data.payload as RestreamMessagePayload;
    } else if (action === 'event') {
      payload = (data.payload as RestreamMessagePayload)?.eventPayload;
    }

    if (!payload || !payload.text) return;

    const rawPlatform =
      payload.platform ??
      (data.payload as RestreamMessagePayload)?.connectionIdentifier ??
      'unknown';
    const platform =
      PLATFORM_MAP[rawPlatform.toLowerCase()] ?? rawPlatform.toLowerCase();
    const author =
      payload.author?.displayName ??
      payload.author?.name ??
      payload.author?.username ??
      'Unknown';
    const avatarUrl = payload.author?.avatarUrl ?? payload.author?.avatar;

    await this.socialService.ingestMessage(productionId, {
      productionId,
      platform,
      author,
      avatarUrl,
      content: payload.text,
      externalId: payload.id,
    });

    this.logger.debug(
      `Restream message ingested — platform: ${platform}, author: ${author}`,
    );
  }

  async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<RestreamTokenResponse | null> {
    const clientId = this.configService.get<string>('RESTREAM_CLIENT_ID') ?? '';
    const clientSecret =
      this.configService.get<string>('RESTREAM_CLIENT_SECRET') ?? '';

    return fetchRestreamToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
  }

  async refreshAccessToken(
    productionId: string,
    refreshToken: string,
  ): Promise<void> {
    const clientId = this.configService.get<string>('RESTREAM_CLIENT_ID') ?? '';
    const clientSecret =
      this.configService.get<string>('RESTREAM_CLIENT_SECRET') ?? '';

    const json = await fetchRestreamToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    if (!json) {
      this.logger.error(`Failed to refresh Restream token for ${productionId}`);
      return;
    }

    const expiresAt = new Date(Date.now() + json.expires_in * 1000);

    await this.prisma.restreamConnection.update({
      where: { productionId },
      data: {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt,
      },
    });
  }

  async reconnectAll(): Promise<void> {
    const connections = await this.prisma.restreamConnection.findMany({
      select: { productionId: true },
    });

    for (const { productionId } of connections) {
      await this.connectProduction(productionId);
    }
  }
}
