export interface IVideoEngine {
  isConnected(productionId: string): boolean;
  getRealTimeState(productionId: string): Promise<any>;
  startStream(productionId: string): Promise<{ success: boolean }>;
  stopStream(productionId: string): Promise<{ success: boolean }>;
  startRecord(productionId: string): Promise<{ success: boolean }>;
  stopRecord(productionId: string): Promise<{ success: boolean }>;
  saveReplayBuffer?(productionId: string): Promise<{ success: boolean }>;
}

export interface ISceneEngine extends IVideoEngine {
  changeScene(productionId: string, sceneName: string): Promise<{ success: boolean; sceneName: string }>;
}

export interface IInputEngine extends IVideoEngine {
  changeInput(productionId: string, input: number): Promise<{ success: boolean; input: number; action: string }>;
  cut(productionId: string): Promise<{ success: boolean; action: string }>;
  fade?(productionId: string, duration?: number): Promise<{ success: boolean; action: string; duration?: number }>;
}
