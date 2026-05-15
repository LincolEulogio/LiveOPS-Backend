import { generateObject } from 'ai';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AiCoreService } from './ai-core.service';

interface SocialMessage {
  author: string;
  content: string;
}

interface IntercomCommand {
  message?: string | null;
  sender?: { name?: string | null };
  template?: { name?: string | null } | null;
}

@Injectable()
export class AiSocialService {
  private readonly logger = new Logger(AiSocialService.name);

  constructor(
    private core: AiCoreService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async analyzeSocialMessage(
    content: string,
  ): Promise<{ sentiment: string; category: string; isToxic: boolean }> {
    try {
      const { object } = await generateObject({
        model: this.core.getModel(),
        schema: z.object({
          sentiment: z.enum(['POSITIVO', 'NEGATIVO', 'NEUTRAL']),
          category: z.enum(['PREGUNTA', 'COMENTARIO', 'CUMPLIDO', 'CRITICA']),
          isToxic: z.boolean(),
        }),
        prompt: `Analiza el sentimiento y toxicidad de este mensaje de redes: "${content}". Si es ofensivo o spam, marca isToxic: true.`,
      });
      return object;
    } catch (e: unknown) {
      this.logger.error('Failed to parse AI social sentiment:', e);
      return { sentiment: 'NEUTRAL', category: 'COMENTARIO', isToxic: false };
    }
  }

  async suggestSocialHighlights(
    messages: SocialMessage[],
  ): Promise<{ author: string; content: string; reason: string }[]> {
    const textLog = messages.map((m) => `[${m.author}]: ${m.content}`).join('\n');
    const prompt = `Selecciona los 3 mejores mensajes de este chat para mostrar en pantalla durante el show en vivo.
        Busca mensajes positivos, preguntas interesantes o felicitaciones.

        Chat:
        ${textLog}

        Responde SOLO en JSON:
        { "highlights": [{ "author": "...", "content": "...", "reason": "..." }] }`;

    try {
      const { object } = await generateObject({
        model: this.core.getModel(),
        schema: z.object({
          highlights: z.array(
            z.object({
              author: z.string(),
              content: z.string(),
              reason: z.string(),
            }),
          ),
        }),
        prompt,
      });
      return object.highlights;
    } catch {
      return [];
    }
  }

  async summarizeIntercom(commands: IntercomCommand[]): Promise<string> {
    if (!this.core.tryGetModel() || commands.length === 0) return 'Sin comandos recientes.';

    const historyText = commands
      .map((c) => `${c.sender?.name}: ${c.message}`)
      .join('\n');
    const prompt = `Resume la actividad técnica reciente del Intercom de producción. Sé breve y directo.

        Log de Comandos:
        ${historyText}

        Instrucciones:
        1. Identifica órdenes críticas.
        2. Resume el tono de la comunicación.
        3. Genera un "Estatus de la Dirección" en 2 líneas.`;

    return this.core.generateText(prompt);
  }

  async analyzeMediaAsset(
    name: string,
    type: string,
    mimeType: string,
  ): Promise<{ tags: string[]; description: string; colors?: string[] }> {
    const cacheKey = `media_analysis_${name}_${type}_${mimeType}`;
    const cached = await this.cacheManager.get<{
      tags: string[];
      description: string;
      colors?: string[];
    }>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached analysis for media asset: ${name}`);
      return cached;
    }

    if (!this.core.tryGetModel()) return { tags: [], description: 'AI node offline' };

    const prompt = `Analiza este recurso multimedia para una producción en vivo y genera etiquetas y descripción.

        Nombre: ${name}
        Tipo: ${type}
        MIME: ${mimeType}

        Instrucciones:
        1. Genera 5-8 etiquetas (tags) relevantes.
        2. Escribe una descripción de una línea.
        3. Si puedes inferir colores predominantes por el nombre, inclúyelos.

        Responde SOLO en formato JSON:
        { "tags": ["tag1", "tag2"], "description": "...", "colors": ["#...", "#..."] }`;

    try {
      const { object } = await generateObject({
        model: this.core.getModel(),
        schema: z.object({
          tags: z.array(z.string()),
          description: z.string(),
          colors: z.array(z.string()).optional(),
        }),
        prompt,
      });
      await this.cacheManager.set(cacheKey, object, 86400000);
      return object;
    } catch (e: unknown) {
      this.logger.error('Failed to analyze media asset:', e);
      return { tags: ['media'], description: 'Procesado manualmente' };
    }
  }
}
