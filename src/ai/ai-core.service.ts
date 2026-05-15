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

  async generateText(prompt: string): Promise<string> {
    this.getModel(); // throws if not ready

    if (Date.now() < this.quotaBackoffUntil) {
      const waitSec = Math.ceil((this.quotaBackoffUntil - Date.now()) / 1000);
      throw new ServiceUnavailableException(
        `LIVIA AI temporalmente en cooldown por cuota. Reintenta en ~${waitSec}s.`,
      );
    }

    try {
      this.logger.debug(`Generating text for prompt: ${prompt.substring(0, 100)}...`);
      const { text } = await generateText({ model: this.getModel(), prompt });
      this.logger.debug(`Successfully generated ${text.length} characters.`);
      return text;
    } catch (error: unknown) {
      const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
      if (
        msg.includes('quota exceeded') ||
        msg.includes('rate limit') ||
        msg.includes('too many requests')
      ) {
        const retryMs = this.extractRetryMs(error instanceof Error ? error.message : '');
        this.quotaBackoffUntil = Date.now() + retryMs;
        this.logger.warn(
          `AI quota/rate limited. Enabling cooldown for ${Math.ceil(retryMs / 1000)}s.`,
        );
        throw new ServiceUnavailableException(
          `LIVIA AI en límite de cuota. Reintenta en ~${Math.ceil(retryMs / 1000)}s.`,
        );
      }
      const errMsg = error instanceof Error ? error.message : 'Unknown provider error';
      this.logger.error(`AI Core Failure: ${errMsg}`);
      throw new InternalServerErrorException(`LIVIA Intelligence error: ${errMsg}`);
    }
  }

  streamChat(
    history: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemContext: string,
  ): ReturnType<typeof streamText> {
    return streamText({
      model: this.getModel(),
      messages: [
        { role: 'system', content: systemContext },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
  }

  async chat(
    history: { role: 'user' | 'assistant'; content: string }[],
    systemContext: string,
  ): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.getModel(),
        messages: [
          { role: 'system', content: systemContext },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      return text;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI Chat Failure: ${errMsg}`);
      throw new InternalServerErrorException(`LIVIA Intelligence error: ${errMsg}`);
    }
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
