import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { GuestService } from './guest.service';
import { CreateGuestInvitationDto } from './dto/create-guest-invitation.dto';
import { LiveKitService } from '@/streaming/livekit.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller()
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly liveKitService: LiveKitService,
  ) {}

  @Get('guests/token/:token')
  async getGuestToken(@Param('token') token: string) {
    const invitation = await this.guestService.validateToken(token);
    const roomName = `production_${invitation.productionId}`;
    const lkToken = await this.liveKitService.generateToken(
      roomName,
      `guest-${invitation.id}`,
      invitation.guestName || 'Invitado',
      { isOperator: false },
    );
    return { token: lkToken, url: this.liveKitService.getLiveKitUrl() };
  }

  @Get('productions/:id/guests/invitations')
  @Protected()
  @Permissions('streaming:view')
  async listInvitations(@Param('id') productionId: string) {
    return this.guestService.listInvitations(productionId);
  }

  @Delete('productions/:id/guests/:invitationId')
  @Protected()
  @Permissions('streaming:control')
  async revokeInvitation(
    @Param('id') productionId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.guestService.finalizeGuestById(productionId, invitationId);
  }

  @Post('productions/:id/guests/invite')
  @Protected()
  async createInvite(
    @Param('id') productionId: string,
    @Body() dto: CreateGuestInvitationDto,
  ) {
    return this.guestService.createInvitation(productionId, dto);
  }

  @Get('productions/:id/guest-slots')
  @Protected()
  @Permissions('streaming:view')
  async getGuestSlots(@Param('id') productionId: string) {
    return this.guestService.getGuestSlots(productionId);
  }

  @Patch('productions/:id/guest-slots/:slotId')
  @Protected()
  @Permissions('streaming:control')
  async updateGuestSlot(
    @Param('id') productionId: string,
    @Param('slotId') slotId: string,
    @Body()
    body: {
      vmixInput?: number;
      obsScene?: string;
      status?: 'FREE' | 'PREVIEW' | 'PROGRAM';
      returnFeed?: 'PROGRAM' | 'PREVIEW' | 'CONTROL' | 'NONE';
      ifbVolume?: number;
      programReturnVolume?: number;
    },
  ) {
    return this.guestService.updateGuestSlot(productionId, slotId, body);
  }

  @Post('productions/:id/guest-slots/:slotId/preview')
  @Protected()
  @Permissions('streaming:control')
  async previewGuestSlot(
    @Param('id') productionId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.guestService.takeGuestPreview(productionId, slotId);
  }

  @Post('productions/:id/guest-slots/:slotId/program')
  @Protected()
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
    console.log(
      '[GuestController] POST activateGuest called with token:',
      token,
    );
    return this.guestService.activateGuest(token);
  }

  @Post('guests/finalize/:token')
  async finalizeGuest(@Param('token') token: string) {
    return this.guestService.finalizeGuest(token);
  }

  @Post('productions/:id/guests/:invitationId/finalize')
  @Protected()
  @Permissions('streaming:control')
  async finalizeGuestById(
    @Param('id') productionId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.guestService.finalizeGuestById(productionId, invitationId);
  }
}

