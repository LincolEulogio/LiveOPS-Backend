import { generateObject } from 'ai';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AiCoreService } from './ai-core.service';

interface ShowMetrics {
  durationMs: number;
  avgFps: number;
  maxCpu: number;
  totalDroppedFrames: number;
  samples: number;
}

interface TelemetryEntry {
  fps: number | null;
  cpuUsage: number | null;
  droppedFrames: number | null;
}

interface TimelineBlock {
  title: string;
  durationMs: number;
  status: string;
}

@Injectable()
export class AiAnalyticsService {
  private readonly logger = new Logger(AiAnalyticsService.name);

  constructor(
    private core: AiCoreService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async analyzeShowPerformance(metrics: ShowMetrics): Promise<string> {
    const cacheKey = `performance_analysis_${JSON.stringify(metrics)}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached performance analysis');
      return cached;
    }

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
    const result = await this.core.generateText(prompt);
    await this.cacheManager.set(cacheKey, result, 3600000);
    return result;
  }

  async analyzeTelemetryPredictive(
    logs: TelemetryEntry[],
  ): Promise<{ alert: string; confidence: number; suggestedAction?: string }> {
    const metrics = logs
      .map((l) => `FPS: ${l.fps}, CPU: ${l.cpuUsage}, Dropped: ${l.droppedFrames}`)
      .join('\n');
    const prompt = `Analiza la tendencia de telemetría y predice fallos inminentes.

        Métricas:
        ${metrics}

        Responde SOLO en JSON:
        { "alert": "...", "confidence": 0.0-1.0, "suggestedAction": "..." }`;

    try {
      const { object } = await generateObject({
        model: this.core.getModel(),
        schema: z.object({
          alert: z.string(),
          confidence: z.number(),
          suggestedAction: z.string().optional(),
        }),
        prompt,
      });
      return object;
    } catch {
      return { alert: 'Sin anomalías detectadas', confidence: 0 };
    }
  }

  async analyzeTimelineTiming(blocks: TimelineBlock[]): Promise<string> {
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

    return this.core.generateText(prompt);
  }
}
