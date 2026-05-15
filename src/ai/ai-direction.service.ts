import { generateText } from 'ai';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { ObsService } from '@/obs/obs.service';
import { OverlaysService } from '@/overlays/overlays.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { AiCoreService } from './ai-core.service';

export interface DirectionResult {
  response: string;
  actions: unknown[];
}

@Injectable()
export class AiDirectionService {
  private readonly logger = new Logger(AiDirectionService.name);

  constructor(
    private core: AiCoreService,
    private obsService: ObsService,
    private overlaysService: OverlaysService,
    private notificationsService: NotificationsService,
  ) {}

  async processDirection(
    productionId: string,
    userInput: string,
  ): Promise<DirectionResult> {
    const { text, toolResults } = await generateText({
      model: this.core.getModel(),
      system: `Eres LIVIA, la asistente de dirección de LiveOPS.
      Tienes permiso para realizar acciones técnicas en la producción.
      Si el usuario pide algo que requiere una herramienta, úsala inmediatamente.
      Sé breve y profesional en tus respuestas.`,
      prompt: userInput,
      tools: {
        changeScene: {
          description: 'Cambia la escena activa en OBS.',
          inputSchema: z.object({
            sceneName: z.string().describe('El nombre de la escena a la que cambiar.'),
          }),
          execute: async ({ sceneName }: { sceneName: string }) => {
            this.logger.log(`LIVIA executing scene change: ${sceneName}`);
            return await this.obsService.changeScene(productionId, sceneName);
          },
        },
        toggleOverlay: {
          description: 'Activa o desactiva un overlay gráfico.',
          inputSchema: z.object({
            overlayId: z.string().describe('El ID del overlay.'),
            isActive: z.boolean().describe('Si debe estar activo o no.'),
          }),
          execute: async ({
            overlayId,
            isActive,
          }: {
            overlayId: string;
            isActive: boolean;
          }) => {
            return await this.overlaysService.toggleActive(overlayId, productionId, isActive);
          },
        },
        sendAlert: {
          description: 'Envía una alerta o notificación al equipo.',
          inputSchema: z.object({
            message: z.string().describe('El contenido de la alerta.'),
          }),
          execute: async ({ message }: { message: string }) => {
            await this.notificationsService.sendNotification(productionId, message);
            return { success: true };
          },
        },
      },
    });

    return { response: text, actions: toolResults };
  }
}
