export enum NdiToolsType {
    DISCOVERY = 'DISCOVERY',
    ACCESS_MANAGER = 'ACCESS_MANAGER',
    REMOTE = 'REMOTE',
    ROUTER = 'ROUTER',
    TEST_PATTERNS = 'TEST_PATTERNS',
    STUDIO_MONITOR = 'STUDIO_MONITOR',
    WEBCAM_INPUT = 'WEBCAM_INPUT',
    SCREEN_CAPTURE = 'SCREEN_CAPTURE',
    BRIDGE = 'BRIDGE'
}

export class NdiActionDto {
    type: NdiToolsType;
    action: string;
    payload?: Record<string, unknown>;
}
