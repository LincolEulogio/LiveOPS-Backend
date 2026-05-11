export interface AlertThreshold {
  metric: 'cpuUsage' | 'memoryUsage' | 'droppedFrames' | 'fps' | 'bitrate';
  operator: 'gt' | 'lt';
  value: number;
  label: string;
}

export interface RetentionConfig {
  retentionDays: number;
}

export interface TelemetryStats {
  avgCpu: number;
  avgMemory: number;
  avgFps: number;
  avgBitrate: number;
  totalDroppedFrames: number;
  peakCpu: number;
  peakMemory: number;
  samples: number;
}

export interface ComparisonResult {
  productionA: { id: string; stats: TelemetryStats };
  productionB: { id: string; stats: TelemetryStats };
  periodMinutes: number;
}

export interface DashboardMetrics {
  systemIntegrity: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  humanActivityCount: number;
  securityAlertsCount: number;
  lastSyncAt: string;
}