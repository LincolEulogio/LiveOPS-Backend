export interface SrsKbps {
  recv_30s: number;
  send_30s: number;
  recv_60s?: number;
  send_60s?: number;
}

export interface SrsVideoInfo {
  codec: string;
  profile: string;
  level: string;
  width: number;
  height: number;
}

export interface SrsAudioInfo {
  codec: string;
  sample_rate: number;
  channel: number;
  profile: string;
}

export interface SrsStreamInfo {
  id: string;
  name: string;
  vhost: string;
  app: string;
  tcUrl: string;
  url: string;
  liveMs: number;
  clients: number;
  frames: number;
  send_bytes: number;
  recv_bytes: number;
  kbps: SrsKbps;
  publish: {
    active: boolean;
    cid: number;
  };
  video?: SrsVideoInfo;
  audio?: SrsAudioInfo;
}

export interface SrsApiResponse<T> {
  code: number;
  server: string;
  data: T;
}

export interface SrsStreamsData {
  streams: SrsStreamInfo[];
}

export interface SrsMetrics {
  isActive: boolean;
  bitrateKbps: number;
  clients: number;
  liveMs: number;
  resolution?: { width: number; height: number };
}

export interface SrsHubDestination {
  destId: string;
  platform: string;
  name: string;
  rtmpUrl: string;
  streamKey: string;
}

export interface SrsHubStatus {
  productionId: string;
  ingestUrl: string;
  streamKey: string;
  isActive: boolean;
  destinationCount: number;
  startedAt?: string;
  metrics?: SrsMetrics;
}
