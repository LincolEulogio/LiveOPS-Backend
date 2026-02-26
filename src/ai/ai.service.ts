import { Injectable, Logger, OnModuleInit, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

@Injectable()
export class AiService implements OnModuleInit {
    private readonly logger = new Logger(AiService.name);
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const rawApiKey = this.configService.get<string>('GEMINI_API_KEY');
        const apiKey = rawApiKey?.replace(/["']/g, '').trim();

        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY not found in environment variables. AI features will be disabled.');
            return;
        }

        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            // Según las métricas que envías, 'gemini-2.5-flash' es el que tiene actividad (4/5 RPM).
            // En este contexto de 2026, usaremos ese modelo que es el que tu cuenta reconoce.
            this.model = this.genAI.getGenerativeModel(
                { model: 'gemini-2.5-flash' },
                { apiVersion: 'v1' }
            );
            this.logger.log(`LIVIA AI Node synchronized: gemini-2.5-flash (2026 Series)`);
        } catch (error: any) {
            this.logger.error(`AI initialization failed: ${error.message}`);
        }
    }

    async generateText(prompt: string): Promise<string> {
        if (!this.model) {
            this.logger.error('Gemini Model not initialized. Check API Key.');
            throw new ServiceUnavailableException('LIVIA AI Node is not configured or API Key is missing.');
        }

        try {
            this.logger.debug(`Generating text for prompt: ${prompt.substring(0, 100)}...`);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            this.logger.debug(`Successfully generated ${text.length} characters.`);
            return text;
        } catch (error: any) {
            this.logger.error(`AI Core Failure: ${error.message}`);
            if (error.response) {
                this.logger.error(`Response details: ${JSON.stringify(error.response.data)}`);
            }
            throw new InternalServerErrorException(`LIVIA Intelligence error: ${error.message || 'Unknown provider error'}`);
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

    async analyzeSocialMessage(content: string): Promise<{ sentiment: string, category: string }> {
        const prompt = `
      Analiza el siguiente mensaje de redes sociales para una producción en vivo.
      Determina el sentimiento (POSITIVO, NEGATIVO, NEUTRAL) y la categoría (PREGUNTA, COMENTARIO, CUMPLIDO, CRITICA).
      
      Mensaje: "${content}"
      
      Responde SOLO con este formato JSON:
      {"sentiment": "VALOR", "category": "VALOR"}
    `;

        try {
            const response = await this.generateText(prompt);
            // Clean possible markdown formatting if AI includes it
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            this.logger.error('Failed to parse AI social sentiment:', e);
            return { sentiment: 'NEUTRAL', category: 'COMENTARIO' };
        }
    }

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
        return this.generateText(prompt);
    }

    async generateBriefing(data: { social: string; telemetry: string; script: string }): Promise<string> {
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
}
