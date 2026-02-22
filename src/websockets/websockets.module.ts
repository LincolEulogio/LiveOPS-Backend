import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntercomModule } from '../intercom/intercom.module';
import { ChatModule } from '../chat/chat.module';
import { ScriptModule } from '../script/script.module';
import { EventsGateway } from './events.gateway';

@Module({
    imports: [PrismaModule, IntercomModule, ChatModule, ScriptModule],
    providers: [EventsGateway],
    exports: [EventsGateway],
})
export class WebsocketsModule { }
