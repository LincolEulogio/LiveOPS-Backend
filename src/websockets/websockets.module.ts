import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { IntercomModule } from '@/intercom/intercom.module';
import { ChatModule } from '@/chat/chat.module';
import { ScriptModule } from '@/script/script.module';
import { AuthModule } from '@/auth/auth.module';
import { PresenceService } from '@/websockets/presence.service';
import { CoreGateway } from '@/websockets/gateways/core.gateway';
import { ChatGateway } from '@/websockets/gateways/chat.gateway';
import { ScriptGateway } from '@/websockets/gateways/script.gateway';
import { IntercomGateway } from '@/websockets/gateways/intercom.gateway';
import { ObsGateway } from '@/websockets/gateways/obs.gateway';
import { WebRTCGateway } from '@/websockets/gateways/webrtc.gateway';
import { WsAuthGuard } from '@/websockets/guards/ws-auth.guard';

@Module({
  imports: [PrismaModule, IntercomModule, ChatModule, ScriptModule, AuthModule, ConfigModule],
  providers: [
    PresenceService,
    WsAuthGuard,
    CoreGateway,
    ChatGateway,
    ScriptGateway,
    IntercomGateway,
    ObsGateway,
    WebRTCGateway,
  ],
  exports: [PresenceService, CoreGateway],
})
export class WebsocketsModule {}
