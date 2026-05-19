import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StreamingService } from '@/streaming/streaming.service';

/**
 * SRS calls these endpoints server-to-server when a publisher connects /
 * disconnects. They must be unprotected (no JWT) but should only be
 * reachable from the internal Docker network in production.
 *
 * SRS expects { code: 0 } to allow the action, non-zero to deny.
 */
@Controller('streaming/srs')
@SkipThrottle()
export class SrsWebhookController {
  private readonly logger = new Logger(SrsWebhookController.name);

  constructor(private readonly streamingService: StreamingService) {}

  /**
   * Called by SRS when OBS/vMix starts pushing.
   * Stream key format: prod_<productionId>
   * Return code 0 → allow, non-zero → deny.
   */
  @Post('on-publish')
  @HttpCode(HttpStatus.OK)
  handleOnPublish(@Body() body: Record<string, unknown>) {
    const streamKey = body?.stream as string | undefined;
    if (!streamKey?.startsWith('prod_')) {
      this.logger.warn(`SRS on-publish rejected unknown key: ${streamKey}`);
      return { code: 1 };
    }
    const productionId = streamKey.replace(/^prod_/, '');
    this.logger.log(`SRS on-publish: production=${productionId}`);
    return { code: 0 };
  }

  /**
   * Called by SRS when the publisher disconnects.
   * We stop the hub to clean up all FFmpeg forwarding processes.
   */
  @Post('on-unpublish')
  @HttpCode(HttpStatus.OK)
  async handleOnUnpublish(@Body() body: Record<string, unknown>) {
    const streamKey = body?.stream as string | undefined;
    if (streamKey?.startsWith('prod_')) {
      const productionId = streamKey.replace(/^prod_/, '');
      this.logger.log(`SRS on-unpublish: stopping hub for production=${productionId}`);
      await this.streamingService.stopSrsHub(productionId);
    }
    return { code: 0 };
  }
}
