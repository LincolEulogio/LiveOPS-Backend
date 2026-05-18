import { BadRequestException } from '@nestjs/common';
import { ProductionStatus } from './dto/production.dto';

/**
 * Valid state transitions.
 * Any transition not listed here is rejected.
 */
const ALLOWED_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  [ProductionStatus.DRAFT]:    [ProductionStatus.SETUP, ProductionStatus.ARCHIVED],
  [ProductionStatus.SETUP]:    [ProductionStatus.ACTIVE, ProductionStatus.DRAFT],
  [ProductionStatus.ACTIVE]:   [ProductionStatus.ARCHIVED],
  [ProductionStatus.ARCHIVED]: [], // terminal state
};

export function assertValidTransition(from: string, to: string): void {
  const fromStatus = from as ProductionStatus;
  const toStatus = to as ProductionStatus;

  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) {
    throw new BadRequestException(`Unknown production status: "${from}"`);
  }

  if (!allowed.includes(toStatus)) {
    throw new BadRequestException(
      `Transición de estado inválida: ${from} → ${to}. ` +
        (allowed.length
          ? `Estados permitidos desde ${from}: ${allowed.join(', ')}`
          : `${from} es un estado terminal — no se puede cambiar.`),
    );
  }
}
