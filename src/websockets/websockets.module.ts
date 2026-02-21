import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsGateway } from './events.gateway';

@Module({
    imports: [PrismaModule],
    providers: [EventsGateway],
    exports: [EventsGateway],
})
export class WebsocketsModule { }
