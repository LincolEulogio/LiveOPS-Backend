import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateGuestInvitationDto } from './dto/create-guest-invitation.dto';
import * as crypto from 'crypto';

@Injectable()
export class GuestService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.guestInvitation.create({
      data: {
        token,
        guestName: dto.guestName,
        productionId,
        expiresAt,
      },
    });
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

    if (invitation.status === 'USED') {
      console.warn('[GuestService] Token already used:', token);
      throw new BadRequestException('Este enlace de invitado ya ha sido utilizado');
    }

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
}
