import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  VideoCallService,
  CreateVideoCallDto,
  UpdateVideoCallDto,
  ParticipantRole,
} from './video-call.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtUser } from '@/common/types/jwt-user.types';

@UseGuards(JwtAuthGuard)
@Controller('video-call')
export class VideoCallController {
  constructor(private readonly videoCallService: VideoCallService) {}

  /** List all active/scheduled calls */
  @Get('rooms')
  findAll() {
    return this.videoCallService.findAll();
  }

  /** Create a new call */
  @Post('rooms')
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateVideoCallDto) {
    return this.videoCallService.create(user.userId, dto);
  }

  /** Get one call */
  @Get('rooms/:id')
  findOne(@Param('id') id: string) {
    return this.videoCallService.findOne(id);
  }

  /** Update (title, description, scheduledAt, status) */
  @Patch('rooms/:id')
  update(@Param('id') id: string, @Body() dto: UpdateVideoCallDto) {
    return this.videoCallService.update(id, dto);
  }

  /** Delete a call */
  @Delete('rooms/:id')
  remove(@Param('id') id: string) {
    return this.videoCallService.remove(id);
  }

  /**
   * Join a call by DB id.
   * Body: { name?, role? }  role = 'host' | 'panelist' | 'viewer' | 'green-room'
   * Backend overrides role to 'host' when the requester is the actual host.
   */
  @Post('rooms/:id/join')
  async join(
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('role') requestedRole: ParticipantRole | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    const call = await this.videoCallService.findOne(id);
    const identity = user.userId;
    const isHost = call.hostId === identity;
    const role: ParticipantRole = isHost ? 'host' : (requestedRole ?? 'panelist');

    const token = await this.videoCallService.generateJoinToken(
      call.roomId,
      identity,
      name || 'Participant',
      role,
    );
    if (call.status === 'scheduled')
      await this.videoCallService.update(id, { status: 'active' });

    return {
      token,
      url: this.videoCallService.getLiveKitUrl(),
      roomId: call.roomId,
      callId: call.id,
      isHost,
      role,
      roomType: call.roomType,
    };
  }

  /** Join by roomId directly (for URL sharing) */
  @Post('rooms/by-room/:roomId/join')
  async joinByRoomId(
    @Param('roomId') roomId: string,
    @Body('name') name: string,
    @Body('role') requestedRole: ParticipantRole | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    const identity = user.userId;
    const call = await this.videoCallService.findByRoomId(roomId);
    const isHost = call ? call.hostId === identity : false;
    const role: ParticipantRole = isHost ? 'host' : (requestedRole ?? 'panelist');

    const token = await this.videoCallService.generateJoinToken(
      roomId,
      identity,
      name || 'Participant',
      role,
    );
    return {
      token,
      url: this.videoCallService.getLiveKitUrl(),
      roomId,
      callId: call?.id ?? null,
      isHost,
      role,
      roomType: call?.roomType ?? 'general',
    };
  }

  /** End a room explicitly (host only) */
  @Post('rooms/by-room/:roomId/end')
  async endRoom(@Param('roomId') roomId: string, @CurrentUser() user: JwtUser) {
    const call = await this.videoCallService.findByRoomId(roomId);
    if (call && call.hostId === user.userId) {
      await this.videoCallService.update(call.id, { status: 'ended' });
    }
    return { success: true };
  }

  /** Start recording (host only) */
  @Post('rooms/:id/recording/start')
  startRecording(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.videoCallService.startRecording(id, user.userId);
  }

  /** Stop recording (host only) */
  @Post('rooms/:id/recording/stop')
  stopRecording(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.videoCallService.stopRecording(id, user.userId);
  }
}
