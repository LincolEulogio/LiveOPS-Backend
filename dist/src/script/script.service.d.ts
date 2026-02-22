import { PrismaService } from '../prisma/prisma.service';
export declare class ScriptService {
    private prisma;
    constructor(prisma: PrismaService);
    getScriptState(productionId: string): Promise<{
        id: string;
        productionId: string;
        updatedAt: Date;
        content: import("@prisma/client/runtime/client").Bytes;
    } | null>;
    updateScriptState(productionId: string, update: Buffer): Promise<{
        id: string;
        productionId: string;
        updatedAt: Date;
        content: import("@prisma/client/runtime/client").Bytes;
    }>;
}
