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
  @IsNotEmpty()
  // Allow ws:// or wss://
  @Matches(/^wss?:\/\//, { message: 'URL must start with ws:// or wss://' })
  url: string;

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
