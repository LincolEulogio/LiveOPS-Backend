"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceOnlineEvent = exports.ProductionCreatedEvent = exports.DomainEvents = void 0;
exports.DomainEvents = {
    PRODUCTION_CREATED: 'production.created',
    DEVICE_ONLINE: 'device.online',
    DEVICE_OFFLINE: 'device.offline',
};
class ProductionCreatedEvent {
    productionId;
    operatorId;
    constructor(productionId, operatorId) {
        this.productionId = productionId;
        this.operatorId = operatorId;
    }
}
exports.ProductionCreatedEvent = ProductionCreatedEvent;
class DeviceOnlineEvent {
    deviceId;
    constructor(deviceId) {
        this.deviceId = deviceId;
    }
}
exports.DeviceOnlineEvent = DeviceOnlineEvent;
//# sourceMappingURL=events.js.map