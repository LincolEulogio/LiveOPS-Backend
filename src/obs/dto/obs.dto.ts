import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class SaveObsConnectionDto {
  @IsString()
  @IsOptional()
  @Matches(/^wss?:\/\//, {
    message: 'URL must start with ws:// or wss://',
    each: false,
  })
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

export class CreateObsConnectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^wss?:\/\//, {
    message: 'URL must start with ws:// or wss://',
    each: false,
  })
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

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class ChangeSceneDto {
  @IsString()
  @IsNotEmpty()
  sceneName: string;
}

export class SetSceneCollectionDto {
  @IsString()
  @IsNotEmpty()
  sceneCollectionName: string;
}

export class SetTransitionDto {
  @IsString()
  @IsNotEmpty()
  transitionName: string;

  @IsNumber()
  @IsOptional()
  transitionDuration?: number;
}

export class SetStudioModeDto {
  @IsBoolean()
  enabled: boolean;
}

export class SetTBarDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  position: number;
}
