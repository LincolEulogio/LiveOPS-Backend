"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignUserDto = exports.UpdateProductionStateDto = exports.UpdateProductionDto = exports.CreateProductionDto = exports.VmixConfigDto = exports.ObsConfigDto = exports.ProductionStatus = exports.EngineType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var EngineType;
(function (EngineType) {
    EngineType["OBS"] = "OBS";
    EngineType["VMIX"] = "VMIX";
})(EngineType || (exports.EngineType = EngineType = {}));
var ProductionStatus;
(function (ProductionStatus) {
    ProductionStatus["SETUP"] = "SETUP";
    ProductionStatus["ACTIVE"] = "ACTIVE";
    ProductionStatus["ARCHIVED"] = "ARCHIVED";
    ProductionStatus["DRAFT"] = "DRAFT";
})(ProductionStatus || (exports.ProductionStatus = ProductionStatus = {}));
class ObsConfigDto {
    host;
    port;
    password;
    isEnabled;
    pollingInterval;
}
exports.ObsConfigDto = ObsConfigDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ObsConfigDto.prototype, "host", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ObsConfigDto.prototype, "port", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ObsConfigDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ObsConfigDto.prototype, "isEnabled", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ObsConfigDto.prototype, "pollingInterval", void 0);
class VmixConfigDto {
    host;
    port;
    isEnabled;
    pollingInterval;
}
exports.VmixConfigDto = VmixConfigDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VmixConfigDto.prototype, "host", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VmixConfigDto.prototype, "port", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], VmixConfigDto.prototype, "isEnabled", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], VmixConfigDto.prototype, "pollingInterval", void 0);
class CreateProductionDto {
    name;
    description;
    engineType;
    status;
}
exports.CreateProductionDto = CreateProductionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProductionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(EngineType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductionDto.prototype, "engineType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ProductionStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateProductionDto.prototype, "status", void 0);
class UpdateProductionDto {
    name;
    description;
    engineType;
    status;
    obsConfig;
    vmixConfig;
}
exports.UpdateProductionDto = UpdateProductionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(EngineType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductionDto.prototype, "engineType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ProductionStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProductionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ObsConfigDto),
    __metadata("design:type", ObsConfigDto)
], UpdateProductionDto.prototype, "obsConfig", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => VmixConfigDto),
    __metadata("design:type", VmixConfigDto)
], UpdateProductionDto.prototype, "vmixConfig", void 0);
class UpdateProductionStateDto {
    status;
}
exports.UpdateProductionStateDto = UpdateProductionStateDto;
__decorate([
    (0, class_validator_1.IsEnum)(ProductionStatus),
    __metadata("design:type", String)
], UpdateProductionStateDto.prototype, "status", void 0);
class AssignUserDto {
    email;
    roleName;
}
exports.AssignUserDto = AssignUserDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AssignUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AssignUserDto.prototype, "roleName", void 0);
//# sourceMappingURL=production.dto.js.map