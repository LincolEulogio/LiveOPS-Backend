import { PrismaService } from '../prisma/prisma.service';
import { ObsService } from '../obs/obs.service';
import { VmixService } from '../vmix/vmix.service';
export declare class AutomationEngineService {
    private prisma;
    private obsService;
    private vmixService;
    private readonly logger;
    constructor(prisma: PrismaService, obsService: ObsService, vmixService: VmixService);
    handleEvent(eventPrefix: string, payload: any): Promise<void>;
    private evaluateTriggers;
    private executeActions;
    private logExecution;
}
