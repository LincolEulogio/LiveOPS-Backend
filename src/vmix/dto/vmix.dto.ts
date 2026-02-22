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
  @IsNotEmpty()
  @Matches(/^https?:\/\//, {
    message: 'URL must start with http:// or https://',
  })
  url: string;

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
