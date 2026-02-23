"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nestjs_pino_1 = require("nestjs-pino");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const event_emitter_1 = require("@nestjs/event-emitter");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const websockets_module_1 = require("./websockets/websockets.module");
const auth_module_1 = require("./auth/auth.module");
const productions_module_1 = require("./productions/productions.module");
const prisma_module_1 = require("./prisma/prisma.module");
const production_middleware_1 = require("./common/middleware/production.middleware");
const intercom_module_1 = require("./intercom/intercom.module");
const obs_module_1 = require("./obs/obs.module");
const vmix_module_1 = require("./vmix/vmix.module");
const timeline_module_1 = require("./timeline/timeline.module");
const automation_module_1 = require("./automation/automation.module");
const analytics_module_1 = require("./analytics/analytics.module");
const streaming_module_1 = require("./streaming/streaming.module");
const users_module_1 = require("./users/users.module");
const media_module_1 = require("./media/media.module");
const chat_module_1 = require("./chat/chat.module");
const script_module_1 = require("./script/script.module");
const social_module_1 = require("./social/social.module");
const hardware_module_1 = require("./hardware/hardware.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(production_middleware_1.ProductionMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    transport: process.env.NODE_ENV !== 'production'
                        ? { target: 'pino-pretty' }
                        : undefined,
                },
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            event_emitter_1.EventEmitterModule.forRoot({ wildcard: true }),
            websockets_module_1.WebsocketsModule,
            auth_module_1.AuthModule,
            productions_module_1.ProductionsModule,
            prisma_module_1.PrismaModule,
            intercom_module_1.IntercomModule,
            obs_module_1.ObsModule,
            vmix_module_1.VmixModule,
            timeline_module_1.TimelineModule,
            automation_module_1.AutomationModule,
            analytics_module_1.AnalyticsModule,
            streaming_module_1.StreamingModule,
            users_module_1.UsersModule,
            media_module_1.MediaModule,
            chat_module_1.ChatModule,
            script_module_1.ScriptModule,
            social_module_1.SocialModule,
            hardware_module_1.HardwareModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map