import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
export declare class RehearsalService {
    private prisma;
    private eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    generateMockData(): Promise<void>;
    private generateMockTelemetry;
    private generateMockSocial;
}
