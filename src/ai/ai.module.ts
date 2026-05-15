import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObsModule } from '@/obs/obs.module';
import { OverlaysModule } from '@/overlays/overlays.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { AiCoreService } from './ai-core.service';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiContentService } from './ai-content.service';
import { AiSocialService } from './ai-social.service';
import { AiDirectionService } from './ai-direction.service';
import { AiAutomationService } from './ai-automation.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

const AI_PROVIDERS = [
  AiCoreService,
  AiAnalyticsService,
  AiContentService,
  AiSocialService,
  AiDirectionService,
  AiAutomationService,
  AiService,
];

@Global()
@Module({
  imports: [ConfigModule, ObsModule, OverlaysModule, NotificationsModule],
  controllers: [AiController],
  providers: AI_PROVIDERS,
  exports: AI_PROVIDERS,
})
export class AiModule {}
