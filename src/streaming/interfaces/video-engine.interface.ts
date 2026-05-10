export interface IVideoEngine {
  isConnected(productionId: string): boolean;
  getRealTimeState(
    productionId: string,
  ): Promise<{ isConnected: boolean } & Record<string, unknown>>;
  startStream(productionId: string): Promise<{ success: boolean }>;
  stopStream(productionId: string): Promise<{ success: boolean }>;
  startRecord(productionId: string): Promise<{ success: boolean }>;
  stopRecord(productionId: string): Promise<{ success: boolean }>;
  saveReplayBuffer?(productionId: string): Promise<{ success: boolean }>;
  startStreamToDestination?(productionId: string, rtmpUrl: string, streamKey: string): Promise<{ success: boolean }>;
  stopStreamFromDestination?(productionId: string): Promise<{ success: boolean }>;

  // Audio Controls
  setVolume?(
    productionId: string,
    input?: string | number,
    value?: number,
  ): Promise<{ success: boolean }>;
  toggleMute?(
    productionId: string,
    input?: string | number,
  ): Promise<{ success: boolean }>;
  toggleSolo?(
    productionId: string,
    input?: string | number,
  ): Promise<{ success: boolean }>;
  setGain?(
    productionId: string,
    input?: string | number,
    value?: number,
  ): Promise<{ success: boolean }>;
  toggleBus?(
    productionId: string,
    input?: string | number,
    bus?: string,
  ): Promise<{ success: boolean }>;
}

export interface ISceneEngine extends IVideoEngine {
  changeScene(
    productionId: string,
    sceneName: string,
  ): Promise<{ success: boolean; sceneName: string }>;
  setPreviewScene?(
    productionId: string,
    sceneName: string,
  ): Promise<{ success: boolean; sceneName: string }>;
}

export interface IInputEngine extends IVideoEngine {
  changeInput(
    productionId: string,
    input: number,
  ): Promise<{ success: boolean; input: number; action: string }>;
  cut(productionId: string): Promise<{ success: boolean; action: string }>;
  fade?(
    productionId: string,
    duration?: number,
  ): Promise<{ success: boolean; action: string; duration?: number }>;
}
