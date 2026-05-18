import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/common/services/audit.service';
import { UpdateProductionStateDto, ProductionStatus } from './dto/production.dto';
import { assertValidTransition } from './production-state.machine';

@Injectable()
export class ProductionsStateService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  async updateState(productionId: string, dto: UpdateProductionStateDto) {
    const production = await this.prisma.production.findFirst({
      where: { id: productionId, deletedAt: null },
      include: { obsConnections: true, vmixConnection: true },
    });

    if (!production) throw new NotFoundException('Production not found');

    // State machine — rejects invalid transitions before touching the DB
    assertValidTransition(production.status, dto.status);

    // Engine integrity check: cannot go ACTIVE without a configured connection
    if (dto.status === ProductionStatus.ACTIVE) {
      await this.validateEngineConnection(production);
    }

    const updated = await this.prisma.production.update({
      where: { id: productionId },
      data: { status: dto.status as never },
    });

    this.eventEmitter.emit('production.updated', { productionId });

    void this.auditService.log({
      productionId,
      action: 'PRODUCTION_STATE_CHANGE',
      details: { from: production.status, to: updated.status },
    });

    return updated;
  }

  private async validateEngineConnection(
    production: { id: string; engineType: string; obsConnections: { isEnabled: boolean }[]; vmixConnection: { isEnabled: boolean } | null },
  ): Promise<void> {
    const { engineType } = production;

    if (engineType === 'OBS') {
      const hasActive = production.obsConnections.some((c) => c.isEnabled);
      if (!hasActive) {
        throw new BadRequestException(
          'No se puede activar la producción: no hay conexión OBS habilitada. Configura una conexión OBS antes de ir en vivo.',
        );
      }
    }

    if (engineType === 'VMIX') {
      if (!production.vmixConnection?.isEnabled) {
        throw new BadRequestException(
          'No se puede activar la producción: no hay conexión vMix habilitada. Configura una conexión vMix antes de ir en vivo.',
        );
      }
    }
    // APP engine type has no external connection requirement
  }

  async toggleRehearsal(productionId: string, enabled: boolean) {
    const production = await this.prisma.production.findFirst({
      where: { id: productionId, deletedAt: null },
    });

    if (!production) throw new NotFoundException('Production not found');

    if (enabled && production.status === ProductionStatus.ARCHIVED) {
      throw new BadRequestException('No se puede habilitar ensayo en una producción archivada.');
    }

    return this.prisma.production.update({
      where: { id: productionId },
      data: { isRehearsal: enabled },
    });
  }
}
