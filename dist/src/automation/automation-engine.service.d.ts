import { PrismaService } from '@/prisma/prisma.service';
import { ObsService } from '@/obs/obs.service';
import { VmixService } from '@/vmix/vmix.service';
import { IntercomService } from '@/intercom/intercom.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { AuditService } from '@/common/services/audit.service';
interface EventPayload {
    productionId: string;
    [key: string]: string | number | boolean | undefined | null | Date | object;
}
export declare class AutomationEngineService {
    private prisma;
    private obsService;
    private vmixService;
    private intercomService;
    private notificationsService;
    private auditService;
    private readonly logger;
    constructor(prisma: PrismaService, obsService: ObsService, vmixService: VmixService, intercomService: IntercomService, notificationsService: NotificationsService, auditService: AuditService);
    checkTimeTriggers(): Promise<void>;
    handleEvent(eventPrefix: string, payload: EventPayload): Promise<void>;
    handleHardwareTrigger(payload: {
        productionId: string;
        mapKey: string;
    }): Promise<void>;
    private evaluateTriggers;
    private executeActions;
    private logExecution;
}
export {};
