import { Injectable } from '@nestjs/common';
import { streamText } from 'ai';
import { AiCoreService } from './ai-core.service';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiContentService, SeoPackage } from './ai-content.service';
import { AiSocialService } from './ai-social.service';
import { AiDirectionService, DirectionResult } from './ai-direction.service';
import { AiAutomationService } from './ai-automation.service';

// Re-export types that existing callers import from this file
export type { SeoPackage } from './ai-content.service';
export type { DirectionResult } from './ai-direction.service';

/**
 * Facade — preserves the public API used by controllers and domain services.
 * All logic lives in the focused sub-services; this class only delegates.
 */
@Injectable()
export class AiService {
  constructor(
    private core: AiCoreService,
    private analytics: AiAnalyticsService,
    private content: AiContentService,
    private social: AiSocialService,
    private direction: AiDirectionService,
    private automation: AiAutomationService,
  ) {}

  // ─── Core ─────────────────────────────────────────────────────────────────

  generateText(prompt: string): Promise<string> {
    return this.core.generateText(prompt);
  }

  streamChat(
    history: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemContext: string,
  ): ReturnType<typeof streamText> {
    return this.core.streamChat(history, systemContext);
  }

  chat(
    history: { role: 'user' | 'assistant'; content: string }[],
    systemContext: string,
  ): Promise<string> {
    return this.core.chat(history, systemContext);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  analyzeShowPerformance(metrics: Parameters<AiAnalyticsService['analyzeShowPerformance']>[0]): Promise<string> {
    return this.analytics.analyzeShowPerformance(metrics);
  }

  analyzeTelemetryPredictive(
    logs: Parameters<AiAnalyticsService['analyzeTelemetryPredictive']>[0],
  ): Promise<{ alert: string; confidence: number; suggestedAction?: string }> {
    return this.analytics.analyzeTelemetryPredictive(logs);
  }

  analyzeTimelineTiming(
    blocks: Parameters<AiAnalyticsService['analyzeTimelineTiming']>[0],
  ): Promise<string> {
    return this.analytics.analyzeTimelineTiming(blocks);
  }

  // ─── Content ──────────────────────────────────────────────────────────────

  suggestScriptContent(title: string, currentContent: string): Promise<string> {
    return this.content.suggestScriptContent(title, currentContent);
  }

  generateBriefing(data: { social: string; telemetry: string; script: string }): Promise<string> {
    return this.content.generateBriefing(data);
  }

  generatePostShowSEO(data: Parameters<AiContentService['generatePostShowSEO']>[0]): Promise<SeoPackage | { error: string }> {
    return this.content.generatePostShowSEO(data);
  }

  suggestScriptHighlights(
    scriptContent: string,
  ): Promise<{ moment: string; type: string; suggestion: string }[]> {
    return this.content.suggestScriptHighlights(scriptContent);
  }

  // ─── Social ───────────────────────────────────────────────────────────────

  analyzeSocialMessage(
    content: string,
  ): Promise<{ sentiment: string; category: string; isToxic: boolean }> {
    return this.social.analyzeSocialMessage(content);
  }

  suggestSocialHighlights(
    messages: Parameters<AiSocialService['suggestSocialHighlights']>[0],
  ): Promise<{ author: string; content: string; reason: string }[]> {
    return this.social.suggestSocialHighlights(messages);
  }

  summarizeIntercom(
    commands: Parameters<AiSocialService['summarizeIntercom']>[0],
  ): Promise<string> {
    return this.social.summarizeIntercom(commands);
  }

  analyzeMediaAsset(
    name: string,
    type: string,
    mimeType: string,
  ): Promise<{ tags: string[]; description: string; colors?: string[] }> {
    return this.social.analyzeMediaAsset(name, type, mimeType);
  }

  // ─── Direction ────────────────────────────────────────────────────────────

  processDirection(productionId: string, userInput: string): Promise<DirectionResult> {
    return this.direction.processDirection(productionId, userInput);
  }

  // ─── Automation ───────────────────────────────────────────────────────────

  generateAutomationMacro(
    userInput: string,
  ): ReturnType<AiAutomationService['generateAutomationMacro']> {
    return this.automation.generateAutomationMacro(userInput);
  }
}
