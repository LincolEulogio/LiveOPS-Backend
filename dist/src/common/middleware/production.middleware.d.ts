import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
interface RequestWithProduction extends Request {
    productionId?: string;
}
export declare class ProductionMiddleware implements NestMiddleware {
    private prisma;
    constructor(prisma: PrismaService);
    use(req: RequestWithProduction, res: Response, next: NextFunction): Promise<void>;
}
export {};
