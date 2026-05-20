'use strict';

import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChildProcess, spawn } from 'child_process';
import axios from 'axios';
import {
  SrsApiResponse,
  SrsHubDestination,
  SrsHubStatus,
  SrsMetrics,
  SrsStreamsData,
} from './srs.types';
import { FfmpegCompositorService, CompositorLayout } from './ffmpeg-compositor.service';

interface HubEntry {
  destinations: SrsHubDestination[];
  processes: ChildProcess[];
  startedAt: Date;
  layout?: CompositorLayout;
}

@Injectable()
export class SrsService implements OnModuleDestroy {
  private readonly logger = new Logger(SrsService.name);
  private readonly srsApiUrl: string;
  private readonly srsRtmpHost: string;
  private readonly srsRtmpPort: number;

  // productionId → running hub state
  private readonly hubs = new Map<string, HubEntry>();

  constructor(
    private readonly configService: ConfigService,
    private readonly compositor: FfmpegCompositorService,
  ) {
    this.srsApiUrl = this.configService.get<string>('SRS_API_URL', 'http://localhost:1985');
    this.srsRtmpHost = this.configService.get<string>('SRS_RTMP_HOST', 'localhost');
    this.srsRtmpPort = parseInt(
      this.configService.get<string>('SRS_RTMP_PORT', '1935'),
      10,
    );
  }

  // ─── Ingest URL helpers ────────────────────────────────────────────────────

  /** RTMP URL that OBS/vMix must push to */
  getIngestUrl(productionId: string): string {
    return `rtmp://${this.srsRtmpHost}:${this.srsRtmpPort}/live/${this.getStreamKey(productionId)}`;
  }

  /** HLS playback URL served by SRS (port 8080 by default) */
  getHlsUrl(productionId: string): string {
    const hlsPort = this.configService.get<string>('SRS_HLS_PORT', '8080');
    return `http://${this.srsRtmpHost}:${hlsPort}/live/${this.getStreamKey(productionId)}.m3u8`;
  }

  getStreamKey(productionId: string): string {
    return `prod_${productionId}`;
  }

  // ─── Hub lifecycle ─────────────────────────────────────────────────────────

  /**
   * Start the fan-out hub for a production.
   *
   * Simple mode (no layout or preset='full' with 1 source):
   *   Spawns one FFmpeg per destination using `-c copy` for zero re-encode latency.
   *
   * Composite mode (multi-source layout):
   *   Spawns ONE FFmpeg with a `-filter_complex` graph that composites all
   *   input sources and fans out to all destinations via the `tee` muxer.
   *   Source stream keys: prod_<id>_src_0, prod_<id>_src_1, ...
   *   (or override via sourceStreamKeys parameter)
   */
  async startHub(
    productionId: string,
    destinations: SrsHubDestination[],
    layout?: CompositorLayout,
    sourceStreamKeys?: string[],
  ): Promise<SrsHubStatus> {
    await this.stopHub(productionId);

    const processes: ChildProcess[] = [];
    const outputUrls = destinations.map((d) =>
      this.buildRtmpTarget(d.rtmpUrl, d.streamKey),
    );

    const isComposite = layout && layout.preset !== 'full';

    if (isComposite) {
      // Multi-source: build composite FFmpeg process
      const keys = sourceStreamKeys ?? this.defaultSourceKeys(productionId, layout);
      const inputUrls = keys.map(
        (k) => `rtmp://${this.srsRtmpHost}:${this.srsRtmpPort}/live/${k}`,
      );
      const args = this.compositor.buildArgs(layout, inputUrls, outputUrls);
      const proc = this.spawnComposite(productionId, args);
      processes.push(proc);
      this.logger.log(
        `Composite hub started: production=${productionId} preset=${layout.preset} sources=${inputUrls.length} destinations=${destinations.length}`,
      );
    } else {
      // Single source: one FFmpeg per destination (copy, minimal latency)
      const ingestUrl = this.getIngestUrl(productionId);
      for (const dest of destinations) {
        const rtmpTarget = this.buildRtmpTarget(dest.rtmpUrl, dest.streamKey);
        const proc = this.spawnFfmpeg(productionId, dest.name, ingestUrl, rtmpTarget);
        processes.push(proc);
      }
      this.logger.log(
        `Hub started: production=${productionId} destinations=${destinations.length}`,
      );
    }

    const entry: HubEntry = { destinations, processes, startedAt: new Date(), layout };
    this.hubs.set(productionId, entry);
    return this.buildStatus(productionId, entry);
  }

  /** Stream key for source index (used when OBS/vMix pushes multiple sources) */
  getSourceStreamKey(productionId: string, index: number): string {
    return `prod_${productionId}_src_${index}`;
  }

  /** Ingest URL for a specific source index in a multi-source layout */
  getSourceIngestUrl(productionId: string, index: number): string {
    return `rtmp://${this.srsRtmpHost}:${this.srsRtmpPort}/live/${this.getSourceStreamKey(productionId, index)}`;
  }

  /** Stop the fan-out hub and kill all FFmpeg processes */
  async stopHub(productionId: string): Promise<void> {
    const entry = this.hubs.get(productionId);
    if (!entry) return;

    for (const proc of entry.processes) {
      try { proc.kill('SIGTERM'); } catch { /* already dead */ }
    }

    this.hubs.delete(productionId);
    this.logger.log(`Hub stopped: production=${productionId}`);
  }

  /** Returns current status + live SRS metrics for the production */
  async getHubStatus(productionId: string): Promise<SrsHubStatus> {
    const entry = this.hubs.get(productionId);
    if (!entry) {
      return {
        productionId,
        ingestUrl: this.getIngestUrl(productionId),
        streamKey: this.getStreamKey(productionId),
        isActive: false,
        destinationCount: 0,
      };
    }
    const metrics = await this.getStreamMetrics(productionId).catch(() => undefined);
    return { ...this.buildStatus(productionId, entry), metrics };
  }

  isHubActive(productionId: string): boolean {
    return this.hubs.has(productionId);
  }

  // ─── SRS REST API ─────────────────────────────────────────────────────────

  /** Fetch live stream metrics from SRS HTTP API */
  async getStreamMetrics(productionId: string): Promise<SrsMetrics> {
    const streamKey = this.getStreamKey(productionId);

    const { data } = await axios.get<SrsApiResponse<SrsStreamsData>>(
      `${this.srsApiUrl}/api/v1/streams`,
      { timeout: 3000 },
    );

    // SRS response shape varies slightly by version — handle both
    const streams = data.data?.streams ?? (data as unknown as { streams: SrsStreamsData['streams'] }).streams ?? [];
    const stream = streams.find((s) => s.name === streamKey);

    if (!stream) {
      return { isActive: false, bitrateKbps: 0, clients: 0, liveMs: 0 };
    }

    return {
      isActive: stream.publish.active,
      bitrateKbps: stream.kbps?.recv_30s ?? 0,
      clients: stream.clients ?? 0,
      liveMs: stream.liveMs ?? 0,
      resolution: stream.video
        ? { width: stream.video.width, height: stream.video.height }
        : undefined,
    };
  }

  /** Check SRS server health (used by health controller) */
  async isServerReachable(): Promise<boolean> {
    try {
      await axios.get(`${this.srsApiUrl}/api/v1/versions`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  // ─── NestJS lifecycle ──────────────────────────────────────────────────────

  onModuleDestroy() {
    for (const [productionId, entry] of this.hubs.entries()) {
      entry.processes.forEach((p) => { try { p.kill('SIGTERM'); } catch { /* ok */ } });
      this.logger.log(`Shutdown: killed FFmpeg for production ${productionId}`);
    }
    this.hubs.clear();
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private defaultSourceKeys(productionId: string, layout: CompositorLayout): string[] {
    let count = layout.regions?.length ?? 2;
    if (layout.preset === 'studio') count = 3;
    if (layout.preset === 'triple-h') count = 3;
    if (layout.preset === 'grid-4') count = 4;

    return Array.from({ length: count }, (_, i) =>
      this.getSourceStreamKey(productionId, i),
    );
  }

  private spawnComposite(productionId: string, args: string[]): ChildProcess {
    const proc = spawn('ffmpeg', args, { stdio: 'pipe' });

    proc.stderr?.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      if (line.includes('error') || line.includes('Error') || line.includes('Failed')) {
        this.logger.warn(`FFmpeg compositor [${productionId}]: ${line.trim()}`);
      }
    });

    proc.on('error', (err) => {
      this.logger.error(`FFmpeg compositor spawn failed (production ${productionId}): ${err.message}`);
    });

    proc.on('exit', (code, signal) => {
      this.logger.log(`FFmpeg compositor exited: production=${productionId} code=${code} signal=${signal}`);
    });

    return proc;
  }

  private buildRtmpTarget(rtmpUrl: string, streamKey: string): string {
    // Normalise: ensure no double slash between base URL and stream key
    const base = rtmpUrl.endsWith('/') ? rtmpUrl.slice(0, -1) : rtmpUrl;
    const key = streamKey.startsWith('/') ? streamKey.slice(1) : streamKey;
    return `${base}/${key}`;
  }

  private spawnFfmpeg(
    productionId: string,
    destName: string,
    ingestUrl: string,
    rtmpTarget: string,
  ): ChildProcess {
    const ffmpegArgs = [
      '-re',
      '-i', ingestUrl,
      '-c', 'copy',           // no re-encode — zero added latency
      '-f', 'flv',
      rtmpTarget,
    ];

    const proc = spawn('ffmpeg', ffmpegArgs, { stdio: 'pipe' });

    proc.stderr?.on('data', (chunk: Buffer) => {
      // Only log errors/warnings, not the verbose FFmpeg progress lines
      const line = chunk.toString();
      if (line.includes('error') || line.includes('Error') || line.includes('Failed')) {
        this.logger.warn(`FFmpeg [${destName}]: ${line.trim()}`);
      }
    });

    proc.on('error', (err) => {
      this.logger.error(`FFmpeg spawn failed for "${destName}" (production ${productionId}): ${err.message}`);
    });

    proc.on('exit', (code, signal) => {
      this.logger.log(`FFmpeg "${destName}" exited code=${code} signal=${signal}`);
      // Auto-restart once if exit was unexpected (not SIGTERM)
      if (signal !== 'SIGTERM' && signal !== 'SIGKILL' && this.hubs.has(productionId)) {
        this.logger.warn(`Auto-restarting FFmpeg for "${destName}"…`);
        const newProc = this.spawnFfmpeg(productionId, destName, ingestUrl, rtmpTarget);
        const entry = this.hubs.get(productionId);
        if (entry) {
          const idx = entry.processes.indexOf(proc);
          if (idx !== -1) entry.processes[idx] = newProc;
          else entry.processes.push(newProc);
        }
      }
    });

    return proc;
  }

  private buildStatus(productionId: string, entry: HubEntry): SrsHubStatus {
    return {
      productionId,
      ingestUrl: this.getIngestUrl(productionId),
      streamKey: this.getStreamKey(productionId),
      isActive: true,
      destinationCount: entry.destinations.length,
      startedAt: entry.startedAt.toISOString(),
    };
  }
}
