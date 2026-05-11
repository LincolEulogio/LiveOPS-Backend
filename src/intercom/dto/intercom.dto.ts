import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

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
  targetUserId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  requiresAck?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['NORMAL', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  isBroadcast?: boolean;
}
