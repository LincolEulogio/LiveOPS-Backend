"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const obs_connection_manager_1 = require("./obs-connection.manager");
const obs_service_1 = require("./obs.service");
const obs_controller_1 = require("./obs.controller");
let ObsModule = class ObsModule {
};
exports.ObsModule = ObsModule;
exports.ObsModule = ObsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [obs_service_1.ObsService, obs_connection_manager_1.ObsConnectionManager],
        controllers: [obs_controller_1.ObsController],
        exports: [obs_service_1.ObsService, obs_connection_manager_1.ObsConnectionManager]
    })
], ObsModule);
//# sourceMappingURL=obs.module.js.map