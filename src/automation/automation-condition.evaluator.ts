import { Injectable } from '@nestjs/common';
import { Trigger } from '@prisma/client';
import {
  TriggerConditionNode,
  SimpleCondition,
  CompoundCondition,
} from './dto/automation.dto';
import { ConditionValue, EventPayload } from './automation-engine.types';

@Injectable()
export class AutomationConditionEvaluator {
  /**
   * Returns true if any trigger for the given eventPrefix matches the payload.
   * Supports compound AND/OR nodes, SimpleCondition nodes, and legacy flat-map conditions.
   */
  evaluateTriggers(
    triggers: Trigger[],
    eventPrefix: string,
    payload: EventPayload,
  ): boolean {
    const matchingTriggers = triggers.filter((t) => t.eventType === eventPrefix);
    const flatPayload = this.flattenPayload(payload);

    for (const t of matchingTriggers) {
      if (!t.condition) return true;
      const node = t.condition as unknown as TriggerConditionNode;
      if (this.evaluateConditionNode(node, flatPayload)) return true;
    }
    return false;
  }

  evaluateConditionNode(
    node: TriggerConditionNode,
    payload: Record<string, ConditionValue>,
  ): boolean {
    // CompoundCondition: has `operator` AND or OR
    if (
      'operator' in node &&
      ((node as CompoundCondition).operator === 'AND' ||
        (node as CompoundCondition).operator === 'OR')
    ) {
      const compound = node as CompoundCondition;
      if (compound.operator === 'AND') {
        return compound.conditions.every((c) =>
          this.evaluateConditionNode(c as TriggerConditionNode, payload),
        );
      }
      return compound.conditions.some((c) =>
        this.evaluateConditionNode(c as TriggerConditionNode, payload),
      );
    }

    // SimpleCondition: has `field` and `op`
    if ('field' in node && 'op' in node) {
      const simple = node as SimpleCondition;
      const payloadVal = payload[simple.field];
      switch (simple.op) {
        case 'eq':
          return payloadVal === simple.value;
        case 'neq':
          return payloadVal !== simple.value;
        case 'gt':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal > simple.value
          );
        case 'gte':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal >= simple.value
          );
        case 'lt':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal < simple.value
          );
        case 'lte':
          return (
            typeof payloadVal === 'number' &&
            typeof simple.value === 'number' &&
            payloadVal <= simple.value
          );
        case 'contains':
          return (
            typeof payloadVal === 'string' &&
            typeof simple.value === 'string' &&
            payloadVal.includes(simple.value)
          );
        default:
          return false;
      }
    }

    // LegacyCondition: flat key-value map — all entries must match
    const legacy = node as Record<string, ConditionValue>;
    return Object.entries(legacy).every(([key, val]) => payload[key] === val);
  }

  private flattenPayload(payload: EventPayload): Record<string, ConditionValue> {
    const flat: Record<string, ConditionValue> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (
        val === null ||
        typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean'
      ) {
        flat[key] = val;
      }
    }
    return flat;
  }
}
