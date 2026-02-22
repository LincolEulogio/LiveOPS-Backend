import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get(':productionId')
    getHistory(
        @Param('productionId') productionId: string,
        @Query('limit') limit?: number
    ) {
        return this.chatService.getChatHistory(productionId, limit ? Number(limit) : 100);
    }
}
