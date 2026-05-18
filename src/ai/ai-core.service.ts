import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  generateText,
  streamText,
  type LanguageModel,
} from 'ai';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizePromptInput } from './prompt-sanitizer';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

@Injectable()
export class AiCoreService implements OnModuleInit {
  private readonly logger = new Logger(AiCoreService.name);
  private googleModel: LanguageModel | undefined;
  private quotaBackoffUntil = 0;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
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
      this.logger.log('LIVIA AI SDK Node synchronized: gemini-2.5-flash (2026 Series)');
    } catch (error: unknown) {
      this.logger.error(
        `AI SDK initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Returns the underlying model. Throws ServiceUnavailableException if not initialized. */
  getModel(): LanguageModel {
    if (!this.googleModel) {
      throw new ServiceUnavailableException(
        'LIVIA AI Node is not configured or API Key is missing.',
      );
    }
    return this.googleModel;
  }

  /** Returns the model without throwing — callers that need a soft check use this. */
  tryGetModel(): LanguageModel | undefined {
    return this.googleModel;
  }

  async generateText(prompt: string, context?: { userId?: string; productionId?: string }): Promise<string> {
    this.getModel(); // throws if not ready

    if (Date.now() < this.quotaBackoffUntil) {
      const waitSec = Math.ceil((this.quotaBackoffUntil - Date.now()) / 1000);
      throw new ServiceUnavailableException(
        `LIVIA AI temporalmente en cooldown por cuota. Reintenta en ~${waitSec}s.`,
      );
    }

    return this.withRetry(async () => {
      const { text, usage } = await generateText({ model: this.getModel(), prompt });
      this.logTokenUsage('generateText', usage, context);
      return text;
    });
  }

  streamChat(
    history: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemContext: string,
    context?: { userId?: string; productionId?: string },
  ): ReturnType<typeof streamText> {
    // Sanitize all user messages before streaming
    const safeHistory = history.map((m) => ({
      role: m.role,
      content: m.role === 'user' ? sanitizePromptInput(m.content) : m.content,
    }));

    const stream = streamText({
      model: this.getModel(),
      messages: [
        { role: 'system', content: systemContext },
        ...safeHistory,
      ],
      onFinish: ({ usage }) => {
        this.logTokenUsage('streamChat', usage, context);
      },
    });

    return stream;
  }

  async chat(
    history: { role: 'user' | 'assistant'; content: string }[],
    systemContext: string,
    context?: { userId?: string; productionId?: string },
  ): Promise<string> {
    const safeHistory = history.map((m) => ({
      role: m.role,
      content: m.role === 'user' ? sanitizePromptInput(m.content) : m.content,
    }));

    return this.withRetry(async () => {
      const { text, usage } = await generateText({
        model: this.getModel(),
        messages: [
          { role: 'system', content: systemContext },
          ...safeHistory,
        ],
      });
      this.logTokenUsage('chat', usage, context);
      return text;
    });
  }

  /**
   * Retries an AI call up to MAX_RETRIES times with exponential backoff on 429 errors.
   * Other errors are thrown immediately.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();

        const isRateLimit =
          msg.includes('quota exceeded') ||
          msg.includes('rate limit') ||
          msg.includes('too many requests') ||
          msg.includes('429');

        if (!isRateLimit) {
          // Non-retriable error — throw immediately
          const errMsg = error instanceof Error ? error.message : 'Unknown provider error';
          this.logger.error(`AI Core Failure: ${errMsg}`);
          throw new InternalServerErrorException(`LIVIA Intelligence error: ${errMsg}`);
        }

        const retryAfterMs = this.extractRetryMs(error instanceof Error ? error.message : '');
        const backoffMs = attempt === 0
          ? Math.min(retryAfterMs, INITIAL_BACKOFF_MS * Math.pow(2, attempt))
          : INITIAL_BACKOFF_MS * Math.pow(2, attempt);

        this.logger.warn(
          `AI rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${backoffMs}ms...`,
        );

        if (attempt === MAX_RETRIES - 1) {
          // Final attempt exhausted — set global cooldown
          this.quotaBackoffUntil = Date.now() + retryAfterMs;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    const retryMs = this.extractRetryMs(lastError instanceof Error ? lastError.message : '');
    throw new ServiceUnavailableException(
      `LIVIA AI en límite de cuota tras ${MAX_RETRIES} reintentos. Reintenta en ~${Math.ceil(retryMs / 1000)}s.`,
    );
  }

  /**
   * Logs token consumption per call for cost auditing.
   * Format is structured so it can be ingested by log aggregators (Datadog, CloudWatch, etc.)
   */
  private logTokenUsage(
    operation: string,
    usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined,
    context?: { userId?: string; productionId?: string },
  ): void {
    if (!usage) return;
    this.logger.log(
      JSON.stringify({
        event: 'ai.token_usage',
        operation,
        promptTokens: usage.promptTokens ?? 0,
        completionTokens: usage.completionTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
        userId: context?.userId,
        productionId: context?.productionId,
      }),
    );
  }

  private extractRetryMs(message: string): number {
    const secondsMatch = message.match(/retry in\s+([\d.]+)s/i);
    if (secondsMatch?.[1]) {
      const seconds = Number(secondsMatch[1]);
      if (!Number.isNaN(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
    }
    return 60_000;
  }
}
