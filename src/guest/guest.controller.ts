import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { GuestService } from './guest.service';
import { CreateGuestInvitationDto } from './dto/create-guest-invitation.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { LiveKitService } from '@/streaming/livekit.service';

@Controller()
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly liveKitService: LiveKitService,
  ) {}

  @Get('guests/token/:token')
  async getGuestToken(@Param('token') token: string) {
    const invitation = await this.guestService.validateToken(token);
    const lkToken = await this.liveKitService.generateToken(
      invitation.productionId,
      `guest-${invitation.id}`,
      invitation.guestName || 'Invitado',
      false,
    );
    return { token: lkToken, url: this.liveKitService.getLiveKitUrl() };
  }

  @Post('productions/:id/guests/invite')
  @UseGuards(JwtAuthGuard)
  async createInvite(
    @Param('id') productionId: string,
    @Body() dto: CreateGuestInvitationDto,
  ) {
    return this.guestService.createInvitation(productionId, dto);
  }

  @Get('guests/validate/:token')
  async validateToken(@Param('token') token: string) {
    return this.guestService.validateToken(token);
  }

  @Post('guests/activate/:token')
  async activateGuest(@Param('token') token: string) {
    console.log('[GuestController] POST activateGuest called with token:', token);
    return this.guestService.activateGuest(token);
  }
}
