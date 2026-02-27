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
  ): Promise<{ sentiment: string; category: string; isToxic: boolean }> {
    try {
      const { object } = await generateObject({
        model: this.googleModel,
        schema: z.object({
          sentiment: z.enum(['POSITIVO', 'NEGATIVO', 'NEUTRAL']),
          category: z.enum(['PREGUNTA', 'COMENTARIO', 'CUMPLIDO', 'CRITICA']),
          isToxic: z.boolean(),
        }),
        prompt: `Analiza el sentimiento y toxicidad de este mensaje de redes: "${content}". Si es ofensivo o spam, marca isToxic: true.`,
      });
      return object;
    } catch (e) {
      this.logger.error('Failed to parse AI social sentiment:', e);
      return { sentiment: 'NEUTRAL', category: 'COMENTARIO', isToxic: false };
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

  async analyzeMediaAsset(
    name: string,
    type: string,
    mimeType: string,
  ): Promise<{ tags: string[]; description: string; colors?: string[] }> {
    if (!this.googleModel) return { tags: [], description: 'AI node offline' };

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
        model: this.googleModel,
        schema: z.object({
          tags: z.array(z.string()),
          description: z.string(),
          colors: z.array(z.string()).optional(),
        }),
        prompt,
      });
      return object;
    } catch (e) {
      this.logger.error('Failed to analyze media asset:', e);
      return { tags: ['media'], description: 'Procesado manualmente' };
    }
  }

  async summarizeIntercom(commands: any[]): Promise<string> {
    if (!this.googleModel || commands.length === 0)
      return 'Sin comandos recientes.';

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

    return this.generateText(prompt);
  }

  async generateAutomationMacro(userInput: string): Promise<any> {
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
        model: this.googleModel,
        schema: z.object({
          name: z.string(),
          description: z.string(),
          triggers: z.array(z.any()),
          actions: z.array(z.any()),
        }),
        prompt,
      });
      return object;
    } catch (e) {
      this.logger.error('Failed to generate automation macro:', e);
      throw new Error('No se pudo interpretar la automatización.');
    }
  }

  async analyzeTelemetryPredictive(
    logs: any[],
  ): Promise<{ alert: string; confidence: number; suggestedAction?: string }> {
    const metrics = logs
      .map(
        (l) => `FPS: ${l.fps}, CPU: ${l.cpuUsage}, Dropped: ${l.droppedFrames}`,
      )
      .join('\n');
    const prompt = `Analiza la tendencia de telemetría y predice fallos inminentes.
        
        Métricas:
        ${metrics}
        
        Responde SOLO en JSON:
        { "alert": "...", "confidence": 0.0-1.0, "suggestedAction": "..." }`;

    try {
      const { object } = await generateObject({
        model: this.googleModel,
        schema: z.object({
          alert: z.string(),
          confidence: z.number(),
          suggestedAction: z.string().optional(),
        }),
        prompt,
      });
      return object;
    } catch (e) {
      return { alert: 'Sin anomalías detectadas', confidence: 0 };
    }
  }

  async suggestSocialHighlights(messages: any[]): Promise<any[]> {
    const textLog = messages
      .map((m) => `[${m.author}]: ${m.content}`)
      .join('\n');
    const prompt = `Selecciona los 3 mejores mensajes de este chat para mostrar en pantalla durante el show en vivo.
        Busca mensajes positivos, preguntas interesantes o felicitaciones.
        
        Chat:
        ${textLog}
        
        Responde SOLO en JSON:
        { "highlights": [{ "author": "...", "content": "...", "reason": "..." }] }`;

    try {
      const { object } = await generateObject({
        model: this.googleModel,
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
    } catch (e) {
      return [];
    }
  }

  async analyzeTimelineTiming(blocks: any[]): Promise<string> {
    const scheduleText = blocks
      .map((b) => `${b.title} (${b.durationMs / 1000}s) - Status: ${b.status}`)
      .join('\n');
    const prompt = `Analiza la escaleta de producción y sugiere ajustes de tiempo. 
        Si hay bloques activos excediendo su tiempo, sugiere dónde recortar.
        
        Escaleta:
        ${scheduleText}
        
        Instrucciones:
        1. Identifica si vamos retrasados o adelantados.
        2. Sugiere cambios directos en los próximos 3 bloques.`;

    return this.generateText(prompt);
  }

  async suggestScriptHighlights(scriptContent: string): Promise<any[]> {
    const prompt = `Analiza el siguiente guion de producción y marca los 2-3 puntos de "Clímax" o momentos clave donde el director debería lanzar efectos especiales o cambios de cámara importantes.
        
        Guion:
        ${scriptContent}
        
        Responde SOLO en JSON:
        { "highlights": [{ "moment": "Texto del momento", "type": "VISUAL/AUDIO", "suggestion": "..." }] }`;

    try {
      const { object } = await generateObject({
        model: this.googleModel,
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
    } catch (e) {
      return [];
    }
  }

  async generatePostShowSEO(data: any): Promise<any> {
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
        model: this.googleModel,
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
    } catch (e) {
      return { error: 'No se pudo generar el SEO' };
    }
  }
}
