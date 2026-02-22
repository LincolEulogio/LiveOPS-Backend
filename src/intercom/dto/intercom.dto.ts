import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommandTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateCommandTemplateDto extends CreateCommandTemplateDto {}

export class SendCommandDto {
  @IsString()
  @IsNotEmpty()
  productionId: string;

  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsOptional()
  targetRoleId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  requiresAck?: boolean;
}
