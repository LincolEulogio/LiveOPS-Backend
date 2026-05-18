import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as Y from 'yjs';

/** Minimum interval between history snapshots per production (ms). */
const HISTORY_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes
/** Minimum byte size of an update to trigger a history snapshot. */
const HISTORY_MIN_BYTES = 512;
/** Max ScriptHistory rows to keep per production (older rows pruned on write). */
const HISTORY_MAX_ROWS = 100;

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  /** Last snapshot timestamp per productionId. */
  private lastSnapshot = new Map<string, number>();

  constructor(private prisma: PrismaService) {}

  async getScriptState(productionId: string) {
    return this.prisma.productionScript.findUnique({
      where: { productionId },
    });
  }

  async updateScriptState(productionId: string, update: Buffer) {
    const existing = await this.prisma.productionScript.findUnique({
      where: { productionId },
    });

    const doc = new Y.Doc();
    if (existing?.content) {
      Y.applyUpdate(doc, new Uint8Array(existing.content));
    }

    Y.applyUpdate(doc, new Uint8Array(update));
    const mergedContent = Y.encodeStateAsUpdate(doc);

    const result = await this.prisma.productionScript.upsert({
      where: { productionId },
      update: { content: Buffer.from(mergedContent) },
      create: { productionId, content: Buffer.from(mergedContent) },
    });

    // Rate-limited history: only snapshot if enough time has passed AND the update is meaningful.
    // Stores the incremental update (not the full state) to minimize storage.
    const now = Date.now();
    const lastSnap = this.lastSnapshot.get(productionId) ?? 0;
    const isTimeElapsed = now - lastSnap >= HISTORY_INTERVAL_MS;
    const isSignificantChange = update.length >= HISTORY_MIN_BYTES;

    if (isTimeElapsed && isSignificantChange) {
      this.lastSnapshot.set(productionId, now);

      void this.writeHistory(productionId, update, mergedContent);
    }

    return result;
  }

  private async writeHistory(
    productionId: string,
    incrementalUpdate: Buffer,
    fullSnapshot: Uint8Array,
  ): Promise<void> {
    try {
      await this.prisma.scriptHistory.create({
        data: {
          productionId,
          // Store only the incremental update (smaller). Full snapshot is in ProductionScript.
          content: Buffer.from(incrementalUpdate),
          version: new Date().toISOString(),
        },
      });

      // Prune oldest rows beyond the cap to prevent unbounded growth
      const rows = await this.prisma.scriptHistory.findMany({
        where: { productionId },
        orderBy: { createdAt: 'desc' },
        skip: HISTORY_MAX_ROWS,
        select: { id: true },
      });

      if (rows.length > 0) {
        await this.prisma.scriptHistory.deleteMany({
          where: { id: { in: rows.map((r) => r.id) } },
        });
        this.logger.debug(`Pruned ${rows.length} old history rows for production ${productionId}`);
      }
    } catch (err) {
      this.logger.error(
        `History write failed for ${productionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Returns history metadata (no content) for the diff timeline UI. */
  async getHistory(productionId: string) {
    return this.prisma.scriptHistory.findMany({
      where: { productionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        createdAt: true,
        // Expose byte size so the UI can show "small edit" vs "major revision"
        content: false,
      },
    });
  }

  /** Returns the full snapshot for a specific history entry (for restore). */
  async getHistoryEntry(id: string, productionId: string) {
    return this.prisma.scriptHistory.findFirst({
      where: { id, productionId },
    });
  }
}
