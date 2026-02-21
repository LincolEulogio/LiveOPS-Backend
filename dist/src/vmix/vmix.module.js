"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VmixModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const vmix_connection_manager_1 = require("./vmix-connection.manager");
const vmix_service_1 = require("./vmix.service");
const vmix_controller_1 = require("./vmix.controller");
let VmixModule = class VmixModule {
};
exports.VmixModule = VmixModule;
exports.VmixModule = VmixModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [vmix_service_1.VmixService, vmix_connection_manager_1.VmixConnectionManager],
        controllers: [vmix_controller_1.VmixController],
        exports: [vmix_service_1.VmixService, vmix_connection_manager_1.VmixConnectionManager]
    })
], VmixModule);
//# sourceMappingURL=vmix.module.js.map