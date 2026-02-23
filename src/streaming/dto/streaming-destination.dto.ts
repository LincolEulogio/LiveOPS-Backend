import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class CreateStreamingDestinationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    platform: string;

    @IsString()
    @IsNotEmpty()
    @IsUrl()
    rtmpUrl: string;

    @IsString()
    @IsNotEmpty()
    streamKey: string;

    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;
}

export class UpdateStreamingDestinationDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    @IsUrl()
    rtmpUrl?: string;

    @IsString()
    @IsOptional()
    streamKey?: string;

    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
