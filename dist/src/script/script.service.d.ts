import { PrismaService } from '../prisma/prisma.service';
export declare class ScriptService {
    private prisma;
    constructor(prisma: PrismaService);
    getScriptState(productionId: string): Promise<{
        id: string;
        productionId: string;
        content: import("@prisma/client/runtime/client").Bytes;
        updatedAt: Date;
    } | null>;
    updateScriptState(productionId: string, update: Buffer): Promise<{
        id: string;
        productionId: string;
        content: import("@prisma/client/runtime/client").Bytes;
        updatedAt: Date;
    }>;
}
