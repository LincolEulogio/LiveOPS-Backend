import {
  Controller,
  Get,
  Query,
  Res,
  Delete,
  Param,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { RestreamChatService } from '@/social/restream-chat.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('social/restream')
export class RestreamOAuthController {
  private readonly logger = new Logger(RestreamOAuthController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly restreamChatService: RestreamChatService,
  ) {}

  @Get('connect')
  connect(
    @Query('productionId') productionId: string,
    @Res() res: Response,
  ): void {
    if (!productionId) {
      throw new BadRequestException('productionId is required');
    }

    const clientId = this.configService.get<string>('RESTREAM_CLIENT_ID');
    const redirectUri = this.configService.get<string>('RESTREAM_REDIRECT_URI');

    const params = new URLSearchParams({
      client_id: clientId ?? '',
      redirect_uri: redirectUri ?? '',
      response_type: 'code',
      scope: 'chat.read',
      state: productionId,
    });

    res.redirect(
      `https://api.restream.io/oauth/authorize?${params.toString()}`,
    );
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') productionId: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';

    if (error || !code) {
      res.redirect(`${frontendUrl}/productions/${productionId}?restream=error`);
      return;
    }

    const redirectUri = this.configService.get<string>('RESTREAM_REDIRECT_URI');

    try {
      const json = await this.restreamChatService.exchangeCode(
        code,
        redirectUri ?? '',
      );

      if (!json) {
        res.redirect(
          `${frontendUrl}/productions/${productionId}?restream=error`,
        );
        return;
      }

      const expiresAt = new Date(Date.now() + json.expires_in * 1000);

      await this.prisma.restreamConnection.upsert({
        where: { productionId },
        create: {
          productionId,
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
          expiresAt,
        },
        update: {
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
          expiresAt,
        },
      });

      await this.restreamChatService.connectProduction(productionId);

      res.redirect(
        `${frontendUrl}/productions/${productionId}?restream=connected`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Restream OAuth callback failed: ${message}`);
      res.redirect(`${frontendUrl}/productions/${productionId}?restream=error`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:productionId')
  async status(@Param('productionId') productionId: string) {
    try {
      const conn = await this.prisma.restreamConnection.findUnique({
        where: { productionId },
        select: { id: true, expiresAt: true },
      });

      return {
        connected: !!conn,
        wsActive: this.restreamChatService.isConnected(productionId),

        expiresAt: conn?.expiresAt ?? null,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Restream status check failed: ${message}`);
      return {
        connected: false,
        wsActive: false,
        expiresAt: null,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect/:productionId')
  async disconnect(@Param('productionId') productionId: string) {
    try {
      this.restreamChatService.disconnect(productionId);

      await this.prisma.restreamConnection.deleteMany({
        where: { productionId },
      });

      return { ok: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Restream disconnect failed: ${message}`);
      throw new BadRequestException(`Failed to disconnect: ${message}`);
    }
  }
}
