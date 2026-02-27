import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SocialService } from '@/social/social.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('productions/:productionId/social')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('messages')
  @Permissions('social:view')
  getMessages(
    @Param('productionId') productionId: string,
    @Query('status') status?: string,
  ) {
    return this.socialService.getMessages(productionId, status);
  }

  @Get('ai-highlights')
  @Permissions('social:view')
  getAiHighlights(@Param('productionId') productionId: string) {
    return this.socialService.getAiHighlights(productionId);
  }

  @Post('messages')
  @Permissions('social:manage')
  injectMessage(
    @Param('productionId') productionId: string,
    @Body()
    payload: {
      platform: string;
      author: string;
      content: string;
      avatarUrl?: string;
      externalId?: string;
    },
  ) {
    return this.socialService.ingestMessage(productionId, {
      ...payload,
      productionId,
    });
  }

  @Put('messages/:id/status')
  @Permissions('social:manage')
  updateStatus(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.socialService.updateMessageStatus(productionId, id, status);
  }

  // Polls
  @Post('polls')
  @Permissions('social:manage')
  createPoll(
    @Param('productionId') productionId: string,
    @Body() payload: { question: string; options: string[] },
  ) {
    return this.socialService.createPoll(
      productionId,
      payload.question,
      payload.options,
    );
  }

  @Get('polls/active')
  @Permissions('social:view')
  getActivePoll(@Param('productionId') productionId: string) {
    return this.socialService.getActivePoll(productionId);
  }

  @Post('polls/:id/vote')
  @Permissions('social:view')
  votePoll(@Param('id') id: string, @Body('optionId') optionId: string) {
    return this.socialService.votePoll(id, optionId);
  }

  @Delete('polls/:id')
  @Permissions('social:manage')
  closePoll(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.socialService.closePoll(productionId, id);
  }

  @Get('blacklist')
  @Permissions('social:view')
  getBlacklist(@Param('productionId') productionId: string) {
    return this.socialService.getBlacklist(productionId);
  }

  @Put('blacklist')
  @Permissions('social:manage')
  updateBlacklist(
    @Param('productionId') productionId: string,
    @Body('words') words: string[],
  ) {
    this.socialService.setBlacklist(productionId, words);
    return { words };
  }
}
