import { Controller, Post, Get, Param, Body, UseGuards, Patch } from '@nestjs/common';
import { GuestService } from './guest.service';
import { CreateGuestInvitationDto } from './dto/create-guest-invitation.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { LiveKitService } from '@/streaming/livekit.service';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller()
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly liveKitService: LiveKitService,
  ) { }

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

  @Get('productions/:id/guest-slots')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('streaming:view')
  async getGuestSlots(@Param('id') productionId: string) {
    return this.guestService.getGuestSlots(productionId);
  }

  @Patch('productions/:id/guest-slots/:slotId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('streaming:control')
  async updateGuestSlot(
    @Param('id') productionId: string,
    @Param('slotId') slotId: string,
    @Body() body: { vmixInput?: number; obsScene?: string; status?: 'FREE' | 'PREVIEW' | 'PROGRAM'; returnFeed?: 'PROGRAM' | 'PREVIEW' | 'CONTROL' | 'NONE' },
  ) {
    return this.guestService.updateGuestSlot(productionId, slotId, body);
  }

  @Post('productions/:id/guest-slots/:slotId/preview')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('streaming:control')
  async previewGuestSlot(
    @Param('id') productionId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.guestService.takeGuestPreview(productionId, slotId);
  }

  @Post('productions/:id/guest-slots/:slotId/program')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('streaming:control')
  async programGuestSlot(
    @Param('id') productionId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.guestService.takeGuestProgram(productionId, slotId);
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

  @Post('guests/finalize/:token')
  async finalizeGuest(@Param('token') token: string) {
    return this.guestService.finalizeGuest(token);
  }
}
