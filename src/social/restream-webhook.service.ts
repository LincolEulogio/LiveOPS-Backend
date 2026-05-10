import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { SocialService } from '@/social/social.service';
import { RestreamWebhookDto } from '@/social/dto/restream-webhook.dto';
import { normalizePlatform } from './constants/platforms';

@Injectable()
export class RestreamWebhookService {
  private readonly logger = new Logger(RestreamWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly socialService: SocialService,
  ) {}

  validateSignature(rawBody: Buffer, signature: string): void {
    const secret = this.configService.get<string>('RESTREAM_WEBHOOK_SECRET');

    if (!secret) {
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      if (isProduction) {
        throw new UnauthorizedException(
          'RESTREAM_WEBHOOK_SECRET is not configured. Webhook validation is required in production.',
        );
      }
      this.logger.warn(
        'RESTREAM_WEBHOOK_SECRET not configured — skipping signature validation (development only)',
      );
      return;
    }

    const expected =
      'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature ?? '');
    const expBuf = Buffer.from(expected);

    const valid =
      sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);

    if (!valid) {
      throw new UnauthorizedException('Invalid Restream webhook signature');
    }
  }

  async process(productionId: string, dto: RestreamWebhookDto): Promise<void> {
    if (dto.type !== 'chatMessage') {
      this.logger.debug(`Skipping Restream event: ${dto.type}`);
      return;
    }

    const { channel, author, text, id } = dto.payload;

    await this.socialService.ingestMessage(productionId, {
      productionId,
      platform: normalizePlatform(channel.platform),
      author: author.displayName || author.username,
      avatarUrl: author.avatar,
      content: text,
      externalId: id,
    });

    this.logger.debug(
      `Restream webhook message ingested — platform: ${channel.platform}, author: ${author.displayName}`,
    );
  }
}
