import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocialService } from '@/social/social.service';
import { SocialController } from '@/social/social.controller';
import { RestreamWebhookController } from '@/social/restream-webhook.controller';
import { RestreamWebhookService } from '@/social/restream-webhook.service';
import { RestreamChatService } from '@/social/restream-chat.service';
import { RestreamOAuthController } from '@/social/restream-oauth.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    SocialController,
    RestreamWebhookController,
    RestreamOAuthController,
  ],
  providers: [SocialService, RestreamWebhookService, RestreamChatService],
  exports: [SocialService],
})
export class SocialModule implements OnModuleInit {
  constructor(private readonly restreamChatService: RestreamChatService) {}

  async onModuleInit() {
    await this.restreamChatService.reconnectAll();
  }
}
