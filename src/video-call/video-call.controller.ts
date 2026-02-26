import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VideoCallService, CreateVideoCallDto, UpdateVideoCallDto } from './video-call.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('video-call')
export class VideoCallController {
    constructor(private readonly videoCallService: VideoCallService) { }

    /** List all active/scheduled calls */
    @Get('rooms')
    findAll() { return this.videoCallService.findAll(); }

    /** Create a new call */
    @Post('rooms')
    create(@CurrentUser() user: any, @Body() dto: CreateVideoCallDto) {
        return this.videoCallService.create(user?.userId || user?.id || user?.sub, dto);
    }

    /** Get one call */
    @Get('rooms/:id')
    findOne(@Param('id') id: string) { return this.videoCallService.findOne(id); }

    /** Update (title, description, scheduledAt, status) */
    @Patch('rooms/:id')
    update(@Param('id') id: string, @Body() dto: UpdateVideoCallDto) {
        return this.videoCallService.update(id, dto);
    }

    /** Delete a call */
    @Delete('rooms/:id')
    remove(@Param('id') id: string) { return this.videoCallService.remove(id); }

    /** Get a join token for a call by roomId */
    @Post('rooms/:id/join')
    async join(@Param('id') id: string, @Body('name') name: string, @CurrentUser() user: any) {
        const call = await this.videoCallService.findOne(id);
        const identity = user?.userId || user?.id || user?.sub;
        const isHost = call.hostId === identity;
        const token = await this.videoCallService.generateJoinToken(call.roomId, identity, name || user?.name || 'Participant', isHost);
        // Mark as active if still scheduled
        if (call.status === 'scheduled') await this.videoCallService.update(id, { status: 'active' });
        return { token, url: this.videoCallService.getLiveKitUrl(), roomId: call.roomId };
    }

    /** Get a join token by roomId directly (for URL sharing) */
    @Post('rooms/by-room/:roomId/join')
    async joinByRoomId(@Param('roomId') roomId: string, @Body('name') name: string, @CurrentUser() user: any) {
        const identity = user?.userId || user?.id || user?.sub;
        const call = await this.videoCallService.findByRoomId(roomId);
        const isHost = call ? call.hostId === identity : false;
        const token = await this.videoCallService.generateJoinToken(roomId, identity, name || user?.name || 'Participant', isHost);
        return { token, url: this.videoCallService.getLiveKitUrl(), roomId, isHost };
    }

    /** End a room explicitly */
    @Post('rooms/by-room/:roomId/end')
    async endRoom(@Param('roomId') roomId: string, @CurrentUser() user: any) {
        const identity = user?.userId || user?.id || user?.sub;
        const call = await this.videoCallService.findByRoomId(roomId);
        if (call && call.hostId === identity) {
            await this.videoCallService.update(call.id, { status: 'ended' });
        }
        return { success: true };
    }
}
