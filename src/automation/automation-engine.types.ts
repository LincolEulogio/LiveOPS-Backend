import { Rule, Trigger, Action } from '@prisma/client';

export type ConditionValue = string | number | boolean | null;

export interface EventPayload {
  productionId: string;
  [key: string]: ConditionValue | Date | object | undefined;
}

export interface RuleWithActions extends Rule {
  triggers: Trigger[];
  actions: Action[];
}

export type ActionPayload = Record<string, ConditionValue | undefined>;
