import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { SocialService, SocialComment } from './social.service';

@Controller('social')
export class SocialController {
    constructor(private socialService: SocialService) { }

    @Post(':productionId/mock-comment')
    async mockComment(
        @Param('productionId') productionId: string,
        @Body() comment: SocialComment,
    ) {
        return this.socialService.handleIncomingComment(productionId, comment);
    }

    @Post(':productionId/overlay')
    async setOverlay(
        @Param('productionId') productionId: string,
        @Body() comment: SocialComment | null,
    ) {
        return this.socialService.selectCommentForOverlay(productionId, comment);
    }

    @Get(':productionId/active-overlay')
    async getActiveOverlay(@Param('productionId') productionId: string) {
        return this.socialService.getActiveOverlay(productionId);
    }
}
