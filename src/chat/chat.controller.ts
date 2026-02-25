import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from '@/chat/chat.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('chats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

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
