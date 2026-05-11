import { Controller, Get, Param, Query, Patch } from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { ChatService } from '@/chat/chat.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('chats')
@Protected()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':productionId')
  @Permissions('production:view')
  getHistory(
    @Param('productionId') productionId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
    @Query('isPinned') isPinned?: string,
  ) {
    return this.chatService.getChatHistory(productionId, {
      limit: limit ? Number(limit) : 50,
      before,
      parentId,
      search,
      isPinned: isPinned === 'true',
    });
  }

  @Patch(':messageId/pin')
  @Permissions('production:manage')
  togglePin(@Param('messageId') messageId: string) {
    return this.chatService.togglePin(messageId);
  }
}
