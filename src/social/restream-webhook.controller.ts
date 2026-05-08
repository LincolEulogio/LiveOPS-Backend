import {
  Controller,
  Post,
  Body,
  Query,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { RestreamWebhookService } from '@/social/restream-webhook.service';
import { RestreamWebhookDto } from '@/social/dto/restream-webhook.dto';

@Controller('social/webhook')
export class RestreamWebhookController {
  constructor(
    private readonly restreamWebhookService: RestreamWebhookService,
  ) {}

  @Post('restream')
  @HttpCode(HttpStatus.OK)
  async handleRestream(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: RestreamWebhookDto,
    @Headers('restream-signature') signature: string,
    @Query('productionId') productionId: string,
  ) {
    if (!productionId) {
      throw new BadRequestException(
        'productionId query param is required in the webhook URL',
      );
    }

    if (req.rawBody) {
      this.restreamWebhookService.validateSignature(
        req.rawBody,
        signature ?? '',
      );
    }

    await this.restreamWebhookService.process(productionId, body);

    return { ok: true };
  }
}
