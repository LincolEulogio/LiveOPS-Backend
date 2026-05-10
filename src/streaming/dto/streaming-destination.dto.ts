import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

// Matches rtmp:// or rtmps:// URLs
const RTMP_URL_REGEX = /^rtmps?:\/\/.+/i;

export class CreateStreamingDestinationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsNotEmpty()
  @Matches(RTMP_URL_REGEX, { message: 'rtmpUrl must start with rtmp:// or rtmps://' })
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
  @Matches(RTMP_URL_REGEX, { message: 'rtmpUrl must start with rtmp:// or rtmps://' })
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
