export const DomainEvents = {
    PRODUCTION_CREATED: 'production.created',
    DEVICE_ONLINE: 'device.online',
    DEVICE_OFFLINE: 'device.offline'
} as const;

export class ProductionCreatedEvent {
    constructor(
        public readonly productionId: string,
        public readonly operatorId: string
    ) { }
}

export class DeviceOnlineEvent {
    constructor(
        public readonly deviceId: string
    ) { }
}
