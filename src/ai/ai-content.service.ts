import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { AiCoreService } from './ai-core.service';
import { sanitizePromptInput } from './prompt-sanitizer';

export interface SeoPackage {
  youtube: { title: string; description: string; tags: string[] };
  social: { tweet: string; linkedin: string };
  chapters: { time: string; title: string }[];
}

interface ShowData {
  name: string;
  duration: string;
  topics: string;
}

@Injectable()
export class AiContentService {
  constructor(private core: AiCoreService) {}

  async suggestScriptContent(title: string, currentContent: string): Promise<string> {
    const safeTitle = sanitizePromptInput(title, 200);
    const safeContent = sanitizePromptInput(currentContent, 1_000);

    const prompt = `
      Eres un asistente de producción creativa para un programa en vivo.
      Basado en el título del bloque y el contenido actual, genera 3 puntos clave (talking points)
      y una sugerencia de acción de cámara o visual para este segmento.

      Segmento: "${safeTitle}"
      Notas Actuales: "${safeContent}"

      Instrucciones:
      1. Sé conciso, directo y profesional.
      2. Genera 3 bullet points con ideas clave para el presentador.
      3. Añade una sección "Visual/Cámara" con una recomendación técnica.

      Responde en Español.
    `;
    return this.core.generateText(prompt);
  }

  async generateBriefing(data: {
    social: string;
    telemetry: string;
    script: string;
  }): Promise<string> {
    const prompt = `
      Eres LIVIA, la IA de control de dirección de LiveOPS.
      Analiza el estado actual de la producción:

      - Social: ${sanitizePromptInput(data.social, 500)}
      - Telemetría: ${sanitizePromptInput(data.telemetry, 500)}
      - Guion: ${sanitizePromptInput(data.script, 1_000)}

      Instrucciones:
      1. Genera un "Short Briefing" (3-4 líneas) sobre cómo va el show.
      2. Si hay problemas técnicos, identifícalos.
      3. Identifica el "Top Sentiment" de la audiencia.
      4. Sugiere la próxima acción para el director.

      Formato:
      STATUS: [Resumen]
      ALERTS: [Problemas o "All Clear"]
      MOOD: [Sentimiento]
      NEXT: [Sugerencia]

      Responde en Español de forma ejecutiva.
    `;
    return this.core.generateText(prompt);
  }

  async generatePostShowSEO(data: ShowData): Promise<SeoPackage | { error: string }> {
    const prompt = `Genera un paquete de SEO y redes sociales para la producción terminada.

        Datos del Show:
        - Título: ${sanitizePromptInput(data.name, 150)}
        - Duración: ${sanitizePromptInput(data.duration, 50)}
        - Temas tratados: ${sanitizePromptInput(data.topics, 500)}

        Responde SOLO en JSON:
        {
          "youtube": { "title": "...", "description": "...", "tags": [] },
          "social": { "tweet": "...", "linkedin": "..." },
          "chapters": [{ "time": "00:00", "title": "..." }]
        }`;

    try {
      const { object } = await generateObject({
        model: this.core.getModel(),
        schema: z.object({
          youtube: z.object({
            title: z.string(),
            description: z.string(),
            tags: z.array(z.string()),
          }),
          social: z.object({ tweet: z.string(), linkedin: z.string() }),
          chapters: z.array(z.object({ time: z.string(), title: z.string() })),
        }),
        prompt,
      });
      return object;
    } catch {
      return { error: 'No se pudo generar el SEO' };
    }
  }

  /** Streaming variant — use for long-form generation to avoid perceived timeouts. */
  streamSuggestScriptContent(title: string, currentContent: string): ReturnType<typeof streamText> {
    const safeTitle = sanitizePromptInput(title, 200);
    const safeContent = sanitizePromptInput(currentContent, 1_000);
    return streamText({
      model: this.core.getModel(),
      prompt: `Eres un asistente de producción creativa. Genera 3 puntos clave y una sugerencia visual para el segmento "${safeTitle}". Notas: "${safeContent}". Responde en Español.`,
    });
  }

  streamBriefing(data: { social: string; telemetry: string; script: string }): ReturnType<typeof streamText> {
    return streamText({
      model: this.core.getModel(),
      prompt: `Eres LIVIA. Genera un Short Briefing ejecutivo.\n- Social: ${sanitizePromptInput(data.social, 500)}\n- Telemetría: ${sanitizePromptInput(data.telemetry, 500)}\n- Guion: ${sanitizePromptInput(data.script, 1_000)}\nFormato: STATUS / ALERTS / MOOD / NEXT. Español.`,
    });
  }

  async suggestScriptHighlights(
    scriptContent: string,
  ): Promise<{ moment: string; type: string; suggestion: string }[]> {
    const prompt = `Analiza el siguiente guion de producción y marca los 2-3 puntos de "Clímax" o momentos clave donde el director debería lanzar efectos especiales o cambios de cámara importantes.

        Guion:
        ${scriptContent}

        Responde SOLO en JSON:
        { "highlights": [{ "moment": "Texto del momento", "type": "VISUAL/AUDIO", "suggestion": "..." }] }`;

    try {
      const { object } = await generateObject({
        model: this.core.getModel(),
        schema: z.object({
          highlights: z.array(
            z.object({
              moment: z.string(),
              type: z.string(),
              suggestion: z.string(),
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
}
