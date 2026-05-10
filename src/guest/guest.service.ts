import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateGuestInvitationDto } from './dto/create-guest-invitation.dto';
import { StreamingService } from '@/streaming/streaming.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { getErrorMessage } from '@/common/utils/error.util';

type GuestSlotStatus = 'FREE' | 'PREVIEW' | 'PROGRAM';
type GuestReturnFeed = 'PROGRAM' | 'PREVIEW' | 'CONTROL' | 'NONE';

interface GuestSlotConfig {
  vmixInput?: number;
  obsScene?: string;
  status?: GuestSlotStatus;
  returnFeed?: GuestReturnFeed;
}

interface GuestSlotConfigEnvelope {
  slots: Record<string, GuestSlotConfig>;
}

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    private prisma: PrismaService,
    private streamingService: StreamingService,
    private eventEmitter: EventEmitter2,
  ) {}

  private readonly SLOT_CONFIG_EVENT = 'GUEST_SLOT_CONFIG';

  private async emitGuestSlotsUpdated(productionId: string) {
    const slots = await this.getGuestSlots(productionId);
    this.eventEmitter.emit('guest.slots.updated', {
      productionId,
      slots,
      updatedAt: new Date().toISOString(),
    });
  }

  async createInvitation(productionId: string, dto: CreateGuestInvitationDto) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) {
      throw new NotFoundException('Producción no encontrada');
    }

    const token = crypto.randomBytes(32).toString('hex');

    // Default expiry: 24 hours if not provided
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.guestInvitation.create({
      data: {
        token,
        guestName: dto.guestName,
        productionId,
        expiresAt,
      },
    });

    await this.emitGuestSlotsUpdated(productionId);

    return invitation;
  }

  async validateToken(token: string) {
    this.logger.debug(`validateToken called for: ${token.substring(0, 8)}...`);

    // 1. Try to find an explicit invitation by token
    const invitation = await this.prisma.guestInvitation.findUnique({
      where: { token },
      include: {
        production: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    // 2. If not found, check if the token is actually a Production ID (Public Link Mode)
    if (!invitation) {
      const production = await this.prisma.production.findUnique({
        where: { id: token },
        select: { id: true, name: true, status: true },
      });

      if (production) {
        this.logger.log(
          `Public access validated for production: ${production.name}`,
        );
        // Return a virtual invitation for this production
        return {
          id: `public-${production.id}`,
          token: production.id,
          guestName: 'Invitado Público',
          productionId: production.id,
          status: 'PENDING' as const,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Far future
          production,
        };
      }
    }

    if (!invitation) {
      this.logger.warn(`Token not found: ${token.substring(0, 8)}...`);
      throw new NotFoundException(
        'Enlace de invitado no encontrado o inválido',
      );
    }

    if (invitation.expiresAt < new Date()) {
      this.logger.warn(`Token expired: ${token.substring(0, 8)}...`);
      throw new BadRequestException('El enlace de invitado ha expirado');
    }

    this.logger.log(
      `Token validated successfully for: ${invitation.guestName || 'Anonymous Guest'}`,
    );
    return invitation;
  }

  async activateGuest(token: string) {
    try {
      this.logger.debug(
        `Attempting to activate token: ${token.substring(0, 8)}...`,
      );
      const invitation = await this.validateToken(token);

      // If it's a virtual public invitation, we don't update DB
      if (invitation.id.startsWith('public-')) {
        this.logger.log(`Public guest bypass: ${invitation.id}`);
        return invitation;
      }

      const updated = await this.prisma.guestInvitation.update({
        where: { token: token },
        data: { status: 'ACTIVE' },
      });

      await this.emitGuestSlotsUpdated(invitation.productionId);

      this.logger.log(
        `Guest activation successful for: ${invitation.guestName}`,
      );
      return updated;
    } catch (error: unknown) {
      this.logger.error(
        `FAILED to activate guest: ${getErrorMessage(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async finalizeGuest(token: string) {
    const invitation = await this.prisma.guestInvitation.findUnique({
      where: { token },
      select: { id: true, productionId: true, status: true },
    });

    if (!invitation) {
      // Check if it was a public session
      const production = await this.prisma.production.findUnique({
        where: { id: token },
      });
      if (production) return { success: true };

      throw new NotFoundException('Token de invitado inválido');
    }

    return this.releaseInvitation(invitation, { token });
  }

  async finalizeGuestById(productionId: string, invitationId: string) {
    const invitation = await this.prisma.guestInvitation.findFirst({
      where: { id: invitationId, productionId },
      select: { id: true, productionId: true, status: true },
    });
    if (!invitation) throw new NotFoundException('Invitación no encontrada');
    return this.releaseInvitation(invitation, { id: invitationId });
  }

  private async releaseInvitation(
    invitation: { id: string; productionId: string },
    deleteWhere: Prisma.GuestInvitationWhereUniqueInput,
  ) {
    await this.prisma.guestInvitation.delete({ where: deleteWhere });
    const envelope = await this.getSlotConfigEnvelope(invitation.productionId);
    if (envelope.slots[invitation.id]) {
      envelope.slots[invitation.id] = {
        ...envelope.slots[invitation.id],
        status: 'FREE',
      };
      await this.saveSlotConfigEnvelope(invitation.productionId, envelope);
    }
    await this.emitGuestSlotsUpdated(invitation.productionId);
    return { success: true };
  }

  private async getSlotConfigEnvelope(
    productionId: string,
  ): Promise<GuestSlotConfigEnvelope> {
    const latestConfig = await this.prisma.productionLog.findFirst({
      where: {
        productionId,
        eventType: this.SLOT_CONFIG_EVENT,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        details: true,
      },
    });

    const details = latestConfig?.details as GuestSlotConfigEnvelope | null;
    return {
      slots: details?.slots || {},
    };
  }

  private async saveSlotConfigEnvelope(
    productionId: string,
    envelope: GuestSlotConfigEnvelope,
  ) {
    await this.prisma.productionLog.create({
      data: {
        productionId,
        eventType: this.SLOT_CONFIG_EVENT,
        details: envelope as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getGuestSlots(productionId: string) {
    const production = await this.prisma.production.findUnique({
      where: { id: productionId },
      select: { id: true, engineType: true },
    });

    if (!production) {
      throw new NotFoundException('Producción no encontrada');
    }

    const invitations = await this.prisma.guestInvitation.findMany({
      where: {
        productionId,
        status: {
          not: 'USED',
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const envelope = await this.getSlotConfigEnvelope(productionId);

    return invitations.map((invitation, index) => {
      const slotOrder = index + 1;
      const cfg = envelope.slots[invitation.id] || {};
      return {
        slotId: invitation.id,
        invitationId: invitation.id,
        participantIdentity: `guest-${invitation.id}`,
        guestName: invitation.guestName || `Invitado ${slotOrder}`,
        inviteStatus: invitation.status,
        order: slotOrder,
        vmixInput: cfg.vmixInput ?? slotOrder,
        obsScene: cfg.obsScene ?? `GUEST_${slotOrder}`,
        status: cfg.status ?? 'FREE',
        returnFeed: cfg.returnFeed ?? 'CONTROL',
        engineType: production.engineType,
      };
    });
  }

  async updateGuestSlot(
    productionId: string,
    slotId: string,
    patch: {
      vmixInput?: number;
      obsScene?: string;
      status?: GuestSlotStatus;
      returnFeed?: GuestReturnFeed;
    },
  ) {
    const invitation = await this.prisma.guestInvitation.findFirst({
      where: {
        id: slotId,
        productionId,
      },
      select: { id: true },
    });

    if (!invitation) {
      throw new NotFoundException('Slot de invitado no encontrado');
    }

    const envelope = await this.getSlotConfigEnvelope(productionId);
    envelope.slots[slotId] = {
      ...envelope.slots[slotId],
      ...patch,
    };

    await this.saveSlotConfigEnvelope(productionId, envelope);

    const slots = await this.getGuestSlots(productionId);
    const updatedSlot = slots.find((s) => s.slotId === slotId);

    if (patch.returnFeed && updatedSlot) {
      this.eventEmitter.emit('guest.returnfeed.updated', {
        productionId,
        slotId,
        participantIdentity: updatedSlot.participantIdentity,
        returnFeed: updatedSlot.returnFeed,
        updatedAt: new Date().toISOString(),
      });
    }

    await this.emitGuestSlotsUpdated(productionId);

    return updatedSlot;
  }

  async takeGuestPreview(productionId: string, slotId: string) {
    const slots = await this.getGuestSlots(productionId);
    const slot = slots.find((s) => s.slotId === slotId);

    if (!slot) {
      throw new NotFoundException('Slot de invitado no encontrado');
    }

    if (slot.engineType === 'VMIX') {
      await this.streamingService.handleCommand(productionId, {
        type: 'VMIX_SELECT_INPUT',
        payload: { input: slot.vmixInput },
      });
    }

    return this.updateGuestSlot(productionId, slotId, { status: 'PREVIEW' });
  }

  async takeGuestProgram(productionId: string, slotId: string) {
    const slots = await this.getGuestSlots(productionId);
    const slot = slots.find((s) => s.slotId === slotId);

    if (!slot) {
      throw new NotFoundException('Slot de invitado no encontrado');
    }

    if (slot.engineType === 'VMIX') {
      await this.streamingService.handleCommand(productionId, {
        type: 'VMIX_SELECT_INPUT',
        payload: { input: slot.vmixInput },
      });
      await this.streamingService.handleCommand(productionId, {
        type: 'VMIX_CUT',
      });
    } else {
      if (!slot.obsScene) {
        throw new BadRequestException(
          'El slot no tiene escena OBS configurada',
        );
      }

      await this.streamingService.handleCommand(productionId, {
        type: 'CHANGE_SCENE',
        sceneName: slot.obsScene,
      });
    }

    const envelope = await this.getSlotConfigEnvelope(productionId);
    Object.keys(envelope.slots).forEach((key) => {
      envelope.slots[key] = {
        ...envelope.slots[key],
        status:
          key === slotId
            ? 'PROGRAM'
            : envelope.slots[key]?.status === 'PROGRAM'
              ? 'FREE'
              : envelope.slots[key]?.status,
      };
    });

    if (!envelope.slots[slotId]) {
      envelope.slots[slotId] = { status: 'PROGRAM' };
    } else {
      envelope.slots[slotId].status = 'PROGRAM';
    }

    await this.saveSlotConfigEnvelope(productionId, envelope);

    await this.emitGuestSlotsUpdated(productionId);

    const updatedSlots = await this.getGuestSlots(productionId);
    return updatedSlots.find((s) => s.slotId === slotId);
  }
}
