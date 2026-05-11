import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { IntercomModule } from '@/intercom/intercom.module';
import { ChatModule } from '@/chat/chat.module';
import { ScriptModule } from '@/script/script.module';
import { EventsGateway } from '@/websockets/events.gateway';
import { PresenceService } from '@/websockets/presence.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, IntercomModule, ChatModule, ScriptModule, AuthModule],
  providers: [EventsGateway, PresenceService],
  exports: [EventsGateway, PresenceService],
})
export class WebsocketsModule {}
