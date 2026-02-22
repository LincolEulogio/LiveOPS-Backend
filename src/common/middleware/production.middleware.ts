import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductionMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const productionId = req.headers['x-production-id'] as string;

    // We only validate if the header is present, endpoints without it bypass this
    // If an endpoint strictly requires it, the PermissionsGuard will check it too.
    if (productionId) {
      const prod = await this.prisma.production.findUnique({
        where: { id: productionId },
      });
      if (!prod) {
        throw new BadRequestException('Invalid x-production-id header');
      }
      // Attach to request object for easy access
      (req as any).productionId = productionId;
    }

    next();
  }
}
