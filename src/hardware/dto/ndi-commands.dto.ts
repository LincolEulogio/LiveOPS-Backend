export class NdiPtzCommandDto {
  sourceName: string;
  action: 'pan' | 'tilt' | 'zoom' | 'focus' | 'preset';
  value: number;
  speed?: number;
}

export class NdiRouteCommandDto {
  sourceName: string;
  destinationName: string;
}
