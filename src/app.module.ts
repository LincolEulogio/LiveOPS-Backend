import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
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
import { HealthModule } from '@/health/health.module';
import { VideoCallModule } from '@/video-call/video-call.module';
import { GuestModule } from '@/guest/guest.module';
import { NdiModule } from '@/ndi/ndi.module';
import { SportsModule } from '@/sports/sports.module';

@Module({
  imports: [
    AiModule,
    GuestModule,
    NdiModule,
    HealthModule,
    CacheModule.register({
      isGlobal: true,
      // No default TTL — each service must pass its own TTL to cache.set().
      // Recommended constants: CACHE_TTL_PRESENCE=5s, CACHE_TTL_ANALYTICS=300s, CACHE_TTL_PROFILE=3600s
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  ignore: 'pid,hostname,req,res',
                },
              }
            : undefined,
        autoLogging: false,
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 15 },    // burst protection (15 req/sec)
      { name: 'medium', ttl: 10000, limit: 40 }, // general API (40 req/10sec)
      { name: 'auth', ttl: 60000, limit: 10 },   // auth routes
    ]),
    EventEmitterModule.forRoot({
      wildcard: true,
      maxListeners: 20,
      ignoreErrors: false,
    }),
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
    SportsModule,
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
    consumer
      .apply(ProductionMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/*path', method: RequestMethod.ALL },
        { path: 'auth', method: RequestMethod.ALL },
        { path: 'auth/*path', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
