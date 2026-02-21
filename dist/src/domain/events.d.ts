export declare const DomainEvents: {
    readonly PRODUCTION_CREATED: "production.created";
    readonly DEVICE_ONLINE: "device.online";
    readonly DEVICE_OFFLINE: "device.offline";
};
export declare class ProductionCreatedEvent {
    readonly productionId: string;
    readonly operatorId: string;
    constructor(productionId: string, operatorId: string);
}
export declare class DeviceOnlineEvent {
    readonly deviceId: string;
    constructor(deviceId: string);
}
