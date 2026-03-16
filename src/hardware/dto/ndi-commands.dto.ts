export class NdiPtzCommandDto {
    sourceName: string;
    action: 'pan' | 'tilt' | 'zoom' | 'focus' | 'preset';
    value: number; // For continuous movement or preset index
    speed?: number;
}

export class NdiRouteCommandDto {
    sourceName: string;
    destinationName: string; // The NDI output or virtual input to route to
}
