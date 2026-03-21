import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';

export class SaveObsConnectionDto {
  @IsString()
  @IsOptional()
  // Allow ws:// or wss:// if provided directly
  @Matches(/^wss?:\/\//, { message: 'URL must start with ws:// or wss://', each: false })
  url?: string;

  @IsString()
  @IsOptional()
  host?: string;

  @IsString()
  @IsOptional()
  port?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

export class ChangeSceneDto {
  @IsString()
  @IsNotEmpty()
  sceneName: string;
}
