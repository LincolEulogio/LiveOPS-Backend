import { PrismaService } from '../prisma/prisma.service';
import { ObsService } from '../obs/obs.service';
import { VmixService } from '../vmix/vmix.service';
import { IntercomService } from '../intercom/intercom.service';
export declare class AutomationEngineService {
    private prisma;
    private obsService;
    private vmixService;
    private intercomService;
    private readonly logger;
    constructor(prisma: PrismaService, obsService: ObsService, vmixService: VmixService, intercomService: IntercomService);
    checkTimeTriggers(): Promise<void>;
    handleEvent(eventPrefix: string, payload: any): Promise<void>;
    private evaluateTriggers;
    private executeActions;
    private logExecution;
}
