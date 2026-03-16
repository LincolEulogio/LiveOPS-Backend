import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { ObsModule } from '@/obs/obs.module';
import { OverlaysModule } from '@/overlays/overlays.module';
import { NotificationsModule } from '@/notifications/notifications.module';

@Global()
@Module({
  imports: [ConfigModule, ObsModule, OverlaysModule, NotificationsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
