import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateTriggerDto {
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsOptional()
  condition?: any;
}

export class CreateActionDto {
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @IsOptional()
  payload?: any;

  @IsInt()
  @IsOptional()
  order?: number;
}

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerDto)
  triggers: CreateTriggerDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions: CreateActionDto[];
}

export class UpdateRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
