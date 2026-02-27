import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  generateText,
  streamText,
  generateObject,
  type LanguageModel,
} from 'ai';
import { z } from 'zod';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private googleModel: LanguageModel;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const rawApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const apiKey = rawApiKey?.replace(/["']/g, '').trim();

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not found in environment variables. AI features will be disabled.',
      );
      return;
    }

    try {
      const google = createGoogleGenerativeAI({ apiKey });
      this.googleModel = google('gemini-2.5-flash');
      this.logger.log(
        `LIVIA AI SDK Node synchronized: gemini-2.5-flash (2026 Series)`,
      );
    } catch (error: any) {
      this.logger.error(`AI SDK initialization failed: ${error.message}`);
    }
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.googleModel) {
      this.logger.error('Google Model not initialized. Check API Key.');
      throw new ServiceUnavailableException(
        'LIVIA AI Node is not configured or API Key is missing.',
      );
    }

    try {
      this.logger.debug(
        `Generating text for prompt: ${prompt.substring(0, 100)}...`,
      );
      const { text } = await generateText({
        model: this.googleModel,
        prompt: prompt,
      });
      this.logger.debug(`Successfully generated ${text.length} characters.`);
      return text;
    } catch (error: any) {
      this.logger.error(`AI Core Failure: ${error.message}`);
      throw new InternalServerErrorException(
        `LIVIA Intelligence error: ${error.message || 'Unknown provider error'}`,
      );
    }
  }

  async analyzeShowPerformance(metrics: any): Promise<string> {
    const prompt = `
      Eres un director de producción técnica experto. Analiza el siguiente log de telemetría de una producción en vivo y genera un resumen ejecutivo profesional.
      Enfócate en la estabilidad del stream, el uso de recursos y cualquier anomalía detectada.
      
      Métricas del Show:
      - Duración: ${Math.round(metrics.durationMs / 60000)} minutos
      - FPS Promedio: ${metrics.avgFps.toFixed(2)}
      - Uso Máximo de CPU: ${metrics.maxCpu.toFixed(2)}%
      - Total de Cuadros Perdidos (Dropped Frames): ${metrics.totalDroppedFrames}
      - Muestras de telemetría: ${metrics.samples}
      
      Instrucciones:
      1. Sé conciso pero informativo.
      2. Si los cuadros perdidos son altos, sugiere posibles causas (red, codificador).
      3. Si el CPU es alto, advierte sobre la carga del sistema.
      4. Termina con una "Puntuación de Salud del Show" del 1 al 10.
      
      Responde en Español.
    `;
    return this.generateText(prompt);
  }

  async analyzeSocialMessage(
    content: string,
  ): Promise<{ sentiment: string; category: string }> {
    try {
      const { object } = await generateObject({
        model: this.googleModel,
        schema: z.object({
          sentiment: z.enum(['POSITIVO', 'NEGATIVO', 'NEUTRAL']),
          category: z.enum(['PREGUNTA', 'COMENTARIO', 'CUMPLIDO', 'CRITICA']),
        }),
        prompt: `Analiza el siguiente mensaje de redes sociales para una producción en vivo: "${content}"`,
      });
      return object;
    } catch (e) {
      this.logger.error('Failed to parse AI social sentiment:', e);
      return { sentiment: 'NEUTRAL', category: 'COMENTARIO' };
    }
  }

  async suggestScriptContent(
    title: string,
    currentContent: string,
  ): Promise<string> {
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
    return this.generateText(prompt);
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
    return this.generateText(prompt);
  }

  async streamChat(
    history: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemContext: string,
  ): Promise<any> {
    if (!this.googleModel) {
      throw new ServiceUnavailableException(
        'LIVIA AI Node is not configured or API Key is missing.',
      );
    }

    try {
      const messages = [
        { role: 'system' as const, content: systemContext },
        ...history.map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as
            | 'assistant'
            | 'user',
          content: m.content,
        })),
      ];

      return streamText({
        model: this.googleModel,
        messages,
      });
    } catch (error: any) {
      this.logger.error(`AI Stream Chat Failure: ${error.message}`);
      throw new InternalServerErrorException(
        `LIVIA Intelligence error: ${error.message}`,
      );
    }
  }

  async chat(
    history: { role: 'user' | 'assistant'; content: string }[],
    systemContext: string,
  ): Promise<string> {
    if (!this.googleModel) {
      throw new ServiceUnavailableException(
        'LIVIA AI Node is not configured or API Key is missing.',
      );
    }

    try {
      const { text } = await generateText({
        model: this.googleModel,
        messages: [
          { role: 'system', content: systemContext },
          ...history.map((m) => ({
            role: m.role as 'assistant' | 'user',
            content: m.content,
          })),
        ],
      });
      return text;
    } catch (error: any) {
      this.logger.error(`AI Chat Failure: ${error.message}`);
      throw new InternalServerErrorException(
        `LIVIA Intelligence error: ${error.message}`,
      );
    }
  }
}
