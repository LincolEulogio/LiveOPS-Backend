import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export const TRIGGER_EVENT_TYPES = [
  'timeline.before_end',
  'timeline.block.started',
  'timeline.block.ended',
  'manual.trigger',
  'hardware.trigger',
  'obs.scene_changed',
  'vmix.input_changed',
  'intercom.message_received',
] as const;

export type TriggerEventType = (typeof TRIGGER_EVENT_TYPES)[number];

export const ACTION_TYPES = [
  'obs.changeScene',
  'vmix.cut',
  'vmix.fade',
  'vmix.changeInput',
  'intercom.send',
  'webhook.call',
  'engine.instantClip',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

// ─── Condition types (used by the engine, not validated as class) ─────────────

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';

export interface SimpleCondition {
  field: string;
  op: ConditionOperator;
  value: string | number | boolean | null;
}

export interface CompoundCondition {
  operator: 'AND' | 'OR';
  conditions: (SimpleCondition | CompoundCondition | LegacyCondition)[];
}

// Backward-compatible flat map condition: { "key": "value", ... }
export type LegacyCondition = Record<string, string | number | boolean | null>;

export type TriggerConditionNode = SimpleCondition | CompoundCondition | LegacyCondition;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateTriggerDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(TRIGGER_EVENT_TYPES)
  eventType: TriggerEventType;

  @IsOptional()
  condition?: JsonValue;
}

export class CreateActionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ACTION_TYPES)
  actionType: ActionType;

  @IsOptional()
  payload?: JsonValue;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  /** Milliseconds to wait before executing this action (sequential mode). Stored in payload. */
  @IsInt()
  @Min(0)
  @IsOptional()
  delayMs?: number;
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

export class UpdateTriggerDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(TRIGGER_EVENT_TYPES)
  eventType: TriggerEventType;

  @IsOptional()
  condition?: JsonValue;
}

export class UpdateRuleFullDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTriggerDto)
  triggers?: UpdateTriggerDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions?: CreateActionDto[];
}

export class ImportRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRuleDto)
  rules: CreateRuleDto[];
}

export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
