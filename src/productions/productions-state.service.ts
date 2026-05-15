import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/common/services/audit.service';
import { UpdateProductionStateDto } from './dto/production.dto';

@Injectable()
export class ProductionsStateService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  async updateState(productionId: string, dto: UpdateProductionStateDto) {
    const updated = await this.prisma.production.update({
      where: { id: productionId },
      data: { status: dto.status },
    });

    this.eventEmitter.emit('production.updated', { productionId });

    void this.auditService.log({
      productionId,
      action: 'PRODUCTION_STATE_CHANGE',
      details: { status: updated.status },
    });

    return updated;
  }

  async toggleRehearsal(productionId: string, enabled: boolean) {
    return this.prisma.production.update({
      where: { id: productionId },
      data: { isRehearsal: enabled },
    });
  }
}
