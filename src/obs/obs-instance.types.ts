import OBSWebSocket from 'obs-websocket-js';

export interface ObsScene {
  sceneName: string;
  sceneIndex: number;
}

export interface ObsLastState {
  currentScene: string;
  previewScene?: string;
  scenes: string[];
  isStreaming: boolean;
  isRecording: boolean;
  cpuUsage: number;
  fps: number;
  bitrate?: number;
  outputSkippedFrames?: number;
  outputTotalFrames?: number;
  isReplayBufferActive: boolean;
  isVirtualCamActive: boolean;
  studioModeEnabled: boolean;
  sceneCollections: string[];
  currentSceneCollection: string;
  transitions: string[];
  currentTransition: string;
  tBarPosition: number;
  audio?: {
    master?: {
      volume: number;
      muted: boolean;
      meterF1: number;
      meterF2: number;
    };
  };
}

export interface ObsInstance {
  obs: OBSWebSocket;
  url: string;
  password?: string;
  reconnectTimeout?: NodeJS.Timeout;
  statsInterval?: NodeJS.Timeout;
  heartbeatInterval?: NodeJS.Timeout;
  screenshotInterval?: NodeJS.Timeout;
  isConnected: boolean;
  reconnectAttempts: number;
  currentProgramSceneName?: string;
  currentPreviewSceneName?: string;
  lastState?: ObsLastState;
}
