export declare class CreateStreamingDestinationDto {
    name: string;
    platform: string;
    rtmpUrl: string;
    streamKey: string;
    isEnabled?: boolean;
}
export declare class UpdateStreamingDestinationDto {
    name?: string;
    platform?: string;
    rtmpUrl?: string;
    streamKey?: string;
    isEnabled?: boolean;
    isActive?: boolean;
}
