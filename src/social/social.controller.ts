import { Controller, Get, Post, Body, Param, Put, UseGuards, Delete } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('productions/:productionId/social')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialController {
    constructor(private readonly socialService: SocialService) { }

    @Get('messages')
    getMessages(
        @Param('productionId') productionId: string,
        @Param('status') status?: string
    ) {
        return this.socialService.getMessages(productionId, status);
    }

    @Post('messages')
    injectMessage(
        @Param('productionId') productionId: string,
        @Body() payload: { platform: string, author: string, content: string, avatarUrl?: string, externalId?: string }
    ) {
        return this.socialService.ingestMessage(productionId, {
            ...payload,
            productionId
        });
    }

    @Put('messages/:id/status')
    updateStatus(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body('status') status: string
    ) {
        return this.socialService.updateMessageStatus(productionId, id, status);
    }

    // Polls
    @Post('polls')
    createPoll(
        @Param('productionId') productionId: string,
        @Body() payload: { question: string, options: string[] }
    ) {
        return this.socialService.createPoll(productionId, payload.question, payload.options);
    }

    @Get('polls/active')
    getActivePoll(@Param('productionId') productionId: string) {
        return this.socialService.getActivePoll(productionId);
    }

    @Post('polls/:id/vote')
    votePoll(
        @Param('id') id: string,
        @Body('optionId') optionId: string
    ) {
        return this.socialService.votePoll(id, optionId);
    }

    @Delete('polls/:id')
    closePoll(
        @Param('productionId') productionId: string,
        @Param('id') id: string
    ) {
        return this.socialService.closePoll(productionId, id);
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
