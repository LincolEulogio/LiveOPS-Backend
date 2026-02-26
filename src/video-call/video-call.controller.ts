import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { VideoCallService } from './video-call.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('video-call')
export class VideoCallController {
    constructor(private readonly videoCallService: VideoCallService) { }

    /** Any authenticated user can join a video call room */
    @Post('rooms/:roomId/join')
    async joinRoom(
        @Param('roomId') roomId: string,
        @Body('name') name: string,
        @Body('isHost') isHost: boolean = false,
        @CurrentUser() user: any,
    ) {
        const identity = user?.id || user?.sub || `anon_${Date.now()}`;
        const displayName = name || user?.name || 'Participant';
        const token = await this.videoCallService.generateJoinToken(roomId, identity, displayName, isHost);
        return { token, url: this.videoCallService.getLiveKitUrl(), roomId };
    }
}
