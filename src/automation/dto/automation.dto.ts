import { Type } from 'class-transformer';
// ...
export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
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
  condition?: JsonValue;
}

export class CreateActionDto {
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @IsOptional()
  payload?: JsonValue;

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
