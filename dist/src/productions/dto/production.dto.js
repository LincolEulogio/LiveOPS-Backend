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
exports.AssignUserDto = exports.UpdateProductionStateDto = exports.ProductionStatus = exports.CreateProductionDto = void 0;
const class_validator_1 = require("class-validator");
class CreateProductionDto {
    name;
    description;
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
var ProductionStatus;
(function (ProductionStatus) {
    ProductionStatus["DRAFT"] = "DRAFT";
    ProductionStatus["LIVE"] = "LIVE";
    ProductionStatus["FINISHED"] = "FINISHED";
})(ProductionStatus || (exports.ProductionStatus = ProductionStatus = {}));
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