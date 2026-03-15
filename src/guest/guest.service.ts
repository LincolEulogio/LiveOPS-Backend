import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateGuestInvitationDto } from './dto/create-guest-invitation.dto';
import { StreamingService } from '@/streaming/streaming.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

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
  constructor(
    private prisma: PrismaService,
    private streamingService: StreamingService,
    private eventEmitter: EventEmitter2,
  ) { }

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
    console.log('[GuestService] validateToken called for:', token);
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

    if (!invitation) {
      console.warn('[GuestService] Token not found:', token);
      throw new UnauthorizedException('Token de invitado inválido');
    }

    if (invitation.expiresAt < new Date()) {
      console.warn('[GuestService] Token expired:', token);
      throw new UnauthorizedException('El token de invitado ha expirado');
    }

    // Permitimos reutilizar el mismo link mientras no haya expirado.
    // Esto habilita reingreso tras recarga o reconexión del invitado sin bloquear el acceso.

    console.log('[GuestService] Token validated successfully:', token);
    return invitation;
  }

  async activateGuest(token: string) {
    console.log('[GuestService] activateGuest called with token:', token);
    try {
      console.log('[GuestService] Attempting to activate token:', token);
      const invitation = await this.validateToken(token);
      console.log('[GuestService] Validated invitation:', invitation.id);

      const updated = await this.prisma.guestInvitation.update({
        where: { token: token },
        data: { status: 'ACTIVE' },
      });

      await this.emitGuestSlotsUpdated(invitation.productionId);

      console.log('[GuestService] Activation successful for token:', token);
      return updated;
    } catch (error: any) {
      console.error('[GuestService] FAILED to activate guest');
      console.error('Error Type:', error.name);
      console.error('Error Code:', error.code);
      console.error('Error Message:', error.message);
      if (error.meta) console.error('Error Meta:', JSON.stringify(error.meta));
      throw error;
    }
  }

  async finalizeGuest(token: string) {
    const invitation = await this.prisma.guestInvitation.findUnique({
      where: { token },
      select: {
        id: true,
        productionId: true,
        status: true,
      },
    });

    if (!invitation) {
      throw new UnauthorizedException('Token de invitado inválido');
    }

    if (invitation.status !== 'USED') {
      await this.prisma.guestInvitation.update({
        where: { token },
        data: { status: 'USED' },
      });
    }

    // Libera estado de slot persistido para evitar que quede en PROGRAM/PREVIEW.
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

  private async getSlotConfigEnvelope(productionId: string): Promise<GuestSlotConfigEnvelope> {
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

  private async saveSlotConfigEnvelope(productionId: string, envelope: GuestSlotConfigEnvelope) {
    await this.prisma.productionLog.create({
      data: {
        productionId,
        eventType: this.SLOT_CONFIG_EVENT,
        details: envelope as any,
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
    patch: { vmixInput?: number; obsScene?: string; status?: GuestSlotStatus; returnFeed?: GuestReturnFeed },
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
        throw new BadRequestException('El slot no tiene escena OBS configurada');
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
        status: key === slotId ? 'PROGRAM' : envelope.slots[key]?.status === 'PROGRAM' ? 'FREE' : envelope.slots[key]?.status,
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
