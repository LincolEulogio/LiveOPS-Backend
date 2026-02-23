import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebsocketsModule } from './websockets/websockets.module';
import { AuthModule } from './auth/auth.module';
import { ProductionsModule } from './productions/productions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductionMiddleware } from './common/middleware/production.middleware';
import { IntercomModule } from './intercom/intercom.module';
import { ObsModule } from './obs/obs.module';
import { VmixModule } from './vmix/vmix.module';
import { TimelineModule } from './timeline/timeline.module';
import { AutomationModule } from './automation/automation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StreamingModule } from './streaming/streaming.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { ChatModule } from './chat/chat.module';
import { ScriptModule } from './script/script.module';
import { SocialModule } from './social/social.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    EventEmitterModule.forRoot({ wildcard: true }),
    WebsocketsModule,
    AuthModule,
    ProductionsModule,
    PrismaModule,
    IntercomModule,
    ObsModule,
    VmixModule,
    TimelineModule,
    AutomationModule,
    AnalyticsModule,
    StreamingModule,
    UsersModule,
    MediaModule,
    ChatModule,
    ScriptModule,
    SocialModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProductionMiddleware).forRoutes('*');
  }
}
