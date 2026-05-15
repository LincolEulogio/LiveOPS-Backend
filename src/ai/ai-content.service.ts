import { generateObject } from 'ai';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { AiCoreService } from './ai-core.service';

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
    const prompt = `
      Eres un asistente de producción creativa para un programa en vivo.
      Basado en el título del bloque y el contenido actual, genera 3 puntos clave (talking points)
      y una sugerencia de acción de cámara o visual para este segmento.

      Segmento: "${title}"
      Notas Actuales: "${currentContent}"

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

      - Social: ${data.social}
      - Telemetría: ${data.telemetry}
      - Guion: ${data.script}

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
        - Título: ${data.name}
        - Duración: ${data.duration}
        - Temas tratados: ${data.topics}

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
