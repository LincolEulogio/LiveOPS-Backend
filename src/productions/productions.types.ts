import { Prisma } from '@prisma/client';

export interface TriggerConfig {
  eventType: string;
  condition: Prisma.JsonValue;
}

export interface ActionConfig {
  actionType: string;
  payload: Prisma.JsonValue;
  order: number;
}

export interface RuleConfig {
  name: string;
  description: string | null;
  isEnabled: boolean;
  triggers: TriggerConfig[];
  actions: ActionConfig[];
}

export interface TemplateConfig {
  rules: RuleConfig[];
}
