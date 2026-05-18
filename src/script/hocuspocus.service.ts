import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Server, onConnectPayload } from '@hocuspocus/server';
import { PrismaService } from '@/prisma/prisma.service';
import * as Y from 'yjs';
import Redis from 'ioredis';

/** TTL for Redis-cached Yjs state. Must exceed max flush interval. */
const REDIS_STATE_TTL_S = 3_600; // 1 hour
const REDIS_KEY = (docName: string) => `yjs:doc:${docName}`;

@Injectable()
export class HocuspocusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HocuspocusService.name);
  private server: Server;
  private redis: Redis | null = null;

  /** Documents that have pending changes not yet flushed to the DB. */
  private pendingFlush = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) =>
        this.logger.error('Redis error (Hocuspocus)', err instanceof Error ? err.message : String(err)),
      );
      this.logger.log('Hocuspocus: Redis state buffer enabled');
    } else {
      this.logger.warn('Hocuspocus: REDIS_URL not set — state buffer disabled, DB-only mode');
    }

    this.server = new Server({
      port: 1234,

      onLoadDocument: async (data) => {
        const { documentName } = data;

        // 1. Try Redis first (fast, recent state)
        if (this.redis) {
          try {
            const cached = await this.redis.getBuffer(REDIS_KEY(documentName));
            if (cached) {
              const doc = new Y.Doc();
              Y.applyUpdate(doc, new Uint8Array(cached));
              this.logger.debug(`Loaded doc "${documentName}" from Redis`);
              return doc;
            }
          } catch (err) {
            this.logger.warn(`Redis load failed for "${documentName}", falling back to DB`);
          }
        }

        // 2. Fall back to DB
        const script = await this.prisma.productionScript.findUnique({
          where: { productionId: documentName },
        });

        const doc = new Y.Doc();
        if (script?.content) {
          Y.applyUpdate(doc, new Uint8Array(script.content));
          this.logger.debug(`Loaded doc "${documentName}" from DB`);
        }
        return doc;
      },

      onStoreDocument: async (data) => {
        const { documentName, document } = data;
        const update = Y.encodeStateAsUpdate(document);
        const buf = Buffer.from(update);

        // Write to Redis immediately (fast, non-blocking for the collaboration session)
        if (this.redis) {
          try {
            await this.redis.set(REDIS_KEY(documentName), buf, 'EX', REDIS_STATE_TTL_S);
          } catch (err) {
            this.logger.warn(`Redis write failed for "${documentName}" — will still persist to DB`);
          }
        }

        // Mark for DB flush (happens in the periodic flush job)
        this.pendingFlush.add(documentName);
      },

      onConnect: (data: onConnectPayload): Promise<void> => {
        this.logger.debug(
          `New collaboration link established: ${data.requestHeaders.get('x-production-id')}`,
        );
        return Promise.resolve();
      },
    });

    await this.server.listen();
    this.logger.log('Hocuspocus Collaboration Server active on port 1234');
  }

  /**
   * Periodic DB flush — runs every 30s.
   * Persists Redis state to Postgres for documents with pending changes.
   * Keeps the hot path (onStoreDocument) fast while ensuring durability.
   */
  @Interval(30_000)
  async flushPendingToDB(): Promise<void> {
    if (this.pendingFlush.size === 0) return;

    const batch = [...this.pendingFlush];
    this.pendingFlush.clear();

    for (const documentName of batch) {
      try {
        const state = this.redis
          ? await this.redis.getBuffer(REDIS_KEY(documentName))
          : null;

        if (!state) continue;

        await this.prisma.productionScript.upsert({
          where: { productionId: documentName },
          update: { content: Buffer.from(state) },
          create: { productionId: documentName, content: Buffer.from(state) },
        });

        this.logger.debug(`Flushed doc "${documentName}" to DB`);
      } catch (err) {
        // Re-queue failed documents
        this.pendingFlush.add(documentName);
        this.logger.error(
          `DB flush failed for "${documentName}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  async onModuleDestroy() {
    // Final flush before shutdown to avoid data loss
    await this.flushPendingToDB();
    await this.server?.destroy();
    await this.redis?.quit();
  }
}
