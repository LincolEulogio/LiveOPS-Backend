import { NotificationsService } from './notifications.service';
export declare class HealthAlertService {
    private notificationsService;
    private readonly logger;
    private lastAlerts;
    private readonly ALERT_COOLDOWN;
    constructor(notificationsService: NotificationsService);
    handleHealthStats(payload: {
        productionId: string;
        cpuUsage: number;
        skippedFrames: number;
        isStreaming: boolean;
        timestamp: string;
    }): Promise<void>;
    private triggerAlert;
}
