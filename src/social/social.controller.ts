import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionAction } from '../common/constants/rbac.constants';

@Controller('productions/:productionId/social')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialController {
    constructor(private readonly socialService: SocialService) { }

    @Get('messages')
    //@Permissions(PermissionAction.SOCIAL_VIEW) // Assuming we had this permission, or use existing
    getMessages(@Param('productionId') productionId: string) {
        return this.socialService.getMessages(productionId);
    }

    @Post('messages')
    //@Permissions(PermissionAction.SOCIAL_CONTROL) // Dev/Admin testing endpoint
    injectMessage(
        @Param('productionId') productionId: string,
        @Body() payload: { platform: 'twitch' | 'youtube', author: string, content: string, avatarUrl?: string }
    ) {
        return this.socialService.ingestMessage(productionId, {
            productionId,
            ...payload
        });
    }

    @Put('messages/:id/status')
    updateStatus(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body('status') status: 'pending' | 'approved' | 'rejected' | 'on-air'
    ) {
        return this.socialService.updateMessageStatus(productionId, id, status);
    }

    @Get('blacklist')
    getBlacklist(@Param('productionId') productionId: string) {
        return this.socialService.getBlacklist(productionId);
    }

    @Put('blacklist')
    updateBlacklist(
        @Param('productionId') productionId: string,
        @Body('words') words: string[]
    ) {
        this.socialService.setBlacklist(productionId, words);
        return { words };
    }
}
