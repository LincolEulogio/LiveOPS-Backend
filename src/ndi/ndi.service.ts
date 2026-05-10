import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface NdiSource {
  id: string;
  name: string;
  address: string;
  type: 'input' | 'output';
  active: boolean;
}

export interface SrtStream {
  id: string;
  name: string;
  url: string;
  mode: 'caller' | 'listener';
  port: number;
  active: boolean;
  bitrate?: number;
}

@Injectable()
export class NdiService {
  private readonly logger = new Logger(NdiService.name);
  private discoveredSources: NdiSource[] = [];
  private srtStreams: Map<string, SrtStream> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  getDiscoveryOverview() {
    this.logger.log('Fetching NDI/SRT Discovery overview...');
    return {
      status: 'OK',
      sources: this.discoveredSources,
      srtStreams: Array.from(this.srtStreams.values()),
      servers: ['internal'],
    };
  }

  getSources(): NdiSource[] {
    return this.discoveredSources;
  }

  addSource(source: Omit<NdiSource, 'id' | 'active'>) {
    const id = `ndi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const entry: NdiSource = { ...source, id, active: false };
    this.discoveredSources.push(entry);
    this.eventEmitter.emit('ndi.sources.updated', { sources: this.discoveredSources });
    return entry;
  }

  removeSource(sourceId: string) {
    this.discoveredSources = this.discoveredSources.filter((s) => s.id !== sourceId);
    this.eventEmitter.emit('ndi.sources.updated', { sources: this.discoveredSources });
    return { success: true };
  }

  updateAccessControl(config: Record<string, unknown>) {
    this.logger.log(`Updating NDI Access Manager: ${JSON.stringify(config)}`);
    return { success: true, updated: new Date() };
  }

  generateRemoteLink() {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    return {
      link: `ndis://${token}.liveops.internal`,
      srtLink: `srt://0.0.0.0:9000?streamid=${token}&mode=listener`,
      token,
      expires: '24h',
    };
  }

  routeSource(sourceId: string, destinationId: string) {
    this.logger.log(`Routing NDI from ${sourceId} to ${destinationId}`);
    const source = this.discoveredSources.find((s) => s.id === sourceId);
    if (source) source.active = true;
    return { routed: true, sourceId, destinationId, timestamp: new Date() };
  }

  setTestPattern(patternType: string) {
    this.logger.log(`Setting NDI Test Pattern: ${patternType}`);
    return { pattern: patternType, active: true };
  }

  controlMonitor(action: string) {
    return { monitorAction: action, result: 'Command sent' };
  }

  toggleWebcamInput(enable: boolean) {
    return { virtualInput: 'NDI Webcam', active: enable };
  }

  startScreenCapture(region?: string) {
    return { capturing: true, mode: region ?? 'fullscreen' };
  }

  // --- SRT ---

  createSrtStream(params: { name: string; url: string; mode: 'caller' | 'listener'; port: number }) {
    const id = `srt_${Date.now()}`;
    const stream: SrtStream = { ...params, id, active: false };
    this.srtStreams.set(id, stream);
    this.logger.log(`SRT stream created: ${id} (${params.mode}) at ${params.url}:${params.port}`);
    return stream;
  }

  startSrtStream(streamId: string) {
    const stream = this.srtStreams.get(streamId);
    if (!stream) return { success: false, error: 'Stream not found' };
    stream.active = true;
    this.srtStreams.set(streamId, stream);
    this.logger.log(`SRT stream started: ${streamId}`);
    this.eventEmitter.emit('srt.stream.state', { streamId, active: true });
    return { success: true, stream };
  }

  stopSrtStream(streamId: string) {
    const stream = this.srtStreams.get(streamId);
    if (!stream) return { success: false, error: 'Stream not found' };
    stream.active = false;
    this.srtStreams.set(streamId, stream);
    this.logger.log(`SRT stream stopped: ${streamId}`);
    this.eventEmitter.emit('srt.stream.state', { streamId, active: false });
    return { success: true, stream };
  }

  deleteSrtStream(streamId: string) {
    const existed = this.srtStreams.has(streamId);
    this.srtStreams.delete(streamId);
    return { success: existed };
  }

  getSrtStreams(): SrtStream[] {
    return Array.from(this.srtStreams.values());
  }

  configureBridge(settings: Record<string, unknown>) {
    return {
      bridgeStatus: 'connecting',
      wanMode: (settings.mode as string) ?? 'encoder',
    };
  }
}
