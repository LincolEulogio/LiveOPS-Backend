import { IsString, IsISO8601, IsOptional, IsBoolean } from 'class-validator';

export class CreateStreamScheduleDto {
  @IsISO8601()
  scheduledStart: string;

  @IsOptional()
  @IsISO8601()
  scheduledEnd?: string;

  @IsOptional()
  @IsString()
  layout?: string;
}

export class UpdateStreamScheduleDto {
  @IsOptional()
  @IsISO8601()
  scheduledStart?: string;

  @IsOptional()
  @IsISO8601()
  scheduledEnd?: string;

  @IsOptional()
  @IsString()
  layout?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
