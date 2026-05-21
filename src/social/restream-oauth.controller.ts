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
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ): void {
    if (!productionId) {
      throw new BadRequestException('productionId is required');
    }

    const clientId = this.configService.get<string>('RESTREAM_CLIENT_ID');
    const redirectUri = this.configService.get<string>('RESTREAM_REDIRECT_URI');

    const state = JSON.stringify({
      productionId,
      redirect: redirect || 'social',
    });

    const params = new URLSearchParams({
      client_id: clientId ?? '',
      redirect_uri: redirectUri ?? '',
      response_type: 'code',
      scope: 'chat.read',
      state,
    });

    res.redirect(
      `https://api.restream.io/oauth/authorize?${params.toString()}`,
    );
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') stateJson: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4000';

    let productionId = '';
    let redirectPath = 'social';

    interface OAuthState {
      productionId: string;
      redirect: string;
    }

    try {
      const state = JSON.parse(stateJson) as OAuthState;
      productionId = state.productionId;
      redirectPath = state.redirect;
      this.logger.log(
        `Restream callback state: productionId=[${productionId}] (${typeof productionId}), redirect=${redirectPath}`,
      );
    } catch {
      // Fallback if stateJson is just the productionId (old flow)
      productionId = stateJson;
      this.logger.warn(
        `Restream callback fallback: using raw state as productionId=${productionId}`,
      );
    }

    if (error || !code) {
      this.logger.error(`Restream OAuth error: ${error || 'no code provided'}`);
      res.redirect(
        `${frontendUrl}/productions/${productionId}/${redirectPath}?restream=error`,
      );
      return;
    }

    const redirectUri = this.configService.get<string>('RESTREAM_REDIRECT_URI');

    try {
      const json = await this.restreamChatService.exchangeCode(
        code,
        redirectUri ?? '',
      );

      if (!json) {
        this.logger.error('Restream token exchange failed (null response)');
        res.redirect(
          `${frontendUrl}/productions/${productionId}/${redirectPath}?restream=error`,
        );
        return;
      }

      this.logger.log(
        `Upserting Restream connection for production ${productionId}`,
      );
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

      this.logger.log(
        `Restream connection saved. Connecting production chat...`,
      );
      await this.restreamChatService.connectProduction(productionId);

      res.redirect(
        `${frontendUrl}/productions/${productionId}/${redirectPath}?restream=connected`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Restream OAuth callback failed: ${message}`);
      res.redirect(
        `${frontendUrl}/productions/${productionId}/${redirectPath}?restream=error`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:productionId')
  async status(@Param('productionId') productionId: string) {
    this.logger.debug(
      `Checking Restream status for production ${productionId}`,
    );
    try {
      const conn = await this.prisma.restreamConnection.findUnique({
        where: { productionId },
        select: { id: true, expiresAt: true },
      });

      const wsActive = this.restreamChatService.isConnected(productionId);
      this.logger.debug(
        `Status for ${productionId}: connected=${!!conn}, wsActive=${wsActive}`,
      );

      return {
        connected: !!conn,
        wsActive,
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
