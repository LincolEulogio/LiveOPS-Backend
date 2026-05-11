import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsNumber,
} from 'class-validator';

export class SaveVmixConnectionDto {
  @IsString()
  @IsOptional()
  @Matches(/^https?:\/\//, {
    message: 'URL must start with http:// or https://',
  })
  url?: string;

  @IsString()
  @IsOptional()
  host?: string;

  @IsString()
  @IsOptional()
  port?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  pollingInterval?: number;
}

export class ChangeInputDto {
  @IsNumber()
  @IsNotEmpty()
  input: number;
}

export class TransitionDurationDto {
  @IsNumber()
  @IsOptional()
  duration?: number;
}
