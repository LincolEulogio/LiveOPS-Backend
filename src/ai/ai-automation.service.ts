import { generateObject } from 'ai';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { AiCoreService } from './ai-core.service';

interface MacroDefinition {
  name: string;
  description: string;
  triggers: { eventType: string; condition?: Record<string, unknown> }[];
  actions: { actionType: string; payload?: Record<string, unknown> }[];
}

@Injectable()
export class AiAutomationService {
  private readonly logger = new Logger(AiAutomationService.name);

  constructor(private core: AiCoreService) {}

  async generateAutomationMacro(userInput: string): Promise<MacroDefinition> {
    const prompt = `Convierte la siguiente petición de usuario en una Macro de automatización para LiveOPS.

        Petición: "${userInput}"

        Sistemas Disponibles:
        - Triggers: "manual.trigger", "telemetry.fps_drop", "social.keyword", "obs.scene_change"
        - Actions: "obs.switch_scene", "vmix.cut", "audio.set_volume", "social.send_to_overlay", "notification.send_push"

        Responde SOLO en JSON con este formato:
        {
          "name": "Nombre de la Macro",
          "description": "Explicación breve",
          "triggers": [{ "eventType": "...", "condition": {} }],
          "actions": [{ "actionType": "...", "payload": {} }]
        }`;

    try {
      const { object } = await generateObject({
        model: this.core.getModel(),
        schema: z.object({
          name: z.string(),
          description: z.string(),
          triggers: z.array(
            z.object({
              eventType: z.string(),
              condition: z.record(z.string(), z.unknown()).optional(),
            }),
          ),
          actions: z.array(
            z.object({
              actionType: z.string(),
              payload: z.record(z.string(), z.unknown()).optional(),
            }),
          ),
        }),
        prompt,
      });
      return object;
    } catch (e: unknown) {
      this.logger.error('Failed to generate automation macro:', e);
      throw new Error('No se pudo interpretar la automatización.');
    }
  }
}
