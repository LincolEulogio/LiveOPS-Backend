import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLoggingInterceptor } from '@/common/interceptors/audit-logging.interceptor';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { WebsocketsModule } from '@/websockets/websockets.module';
import { AuthModule } from '@/auth/auth.module';
import { ProductionsModule } from '@/productions/productions.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProductionMiddleware } from '@/common/middleware/production.middleware';
import { IntercomModule } from '@/intercom/intercom.module';
import { ObsModule } from '@/obs/obs.module';
import { VmixModule } from '@/vmix/vmix.module';
import { TimelineModule } from '@/timeline/timeline.module';
import { AutomationModule } from '@/automation/automation.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { StreamingModule } from '@/streaming/streaming.module';
import { UsersModule } from '@/users/users.module';
import { MediaModule } from '@/media/media.module';
import { ChatModule } from '@/chat/chat.module';
import { ScriptModule } from '@/script/script.module';
import { SocialModule } from '@/social/social.module';
import { HardwareModule } from '@/hardware/hardware.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { OverlaysModule } from '@/overlays/overlays.module';
import { AuditModule } from '@/audit/audit.module';
import { AiModule } from '@/ai/ai.module';
import { VideoCallModule } from '@/video-call/video-call.module';

@Module({
  imports: [
    AiModule,
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
    HardwareModule,
    NotificationsModule,
    OverlaysModule,
    AuditModule,
    VideoCallModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProductionMiddleware).forRoutes('*');
  }
}
