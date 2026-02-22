import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
export declare class AppService implements OnModuleInit {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    getHello(): string;
    private seedRbac;
}
