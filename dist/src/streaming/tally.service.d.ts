import { EventsGateway } from '../websockets/events.gateway';
export interface TallyUpdate {
    productionId: string;
    engineType: 'OBS' | 'VMIX';
    program: string;
    preview?: string;
}
export declare class TallyService {
    private eventsGateway;
    private readonly logger;
    constructor(eventsGateway: EventsGateway);
    handleObsTally(payload: {
        productionId: string;
        sceneName: string;
    }): void;
    handleVmixTally(payload: {
        productionId: string;
        activeInput: number;
        previewInput: number;
    }): void;
    private broadcastTally;
}
