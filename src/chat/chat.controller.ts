import { Controller, Get, Param, Query } from '@nestjs/common';
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
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getChatHistory(
      productionId,
      limit ? Number(limit) : 100,
    );
  }
}
