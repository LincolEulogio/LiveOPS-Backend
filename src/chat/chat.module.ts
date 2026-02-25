import { Module } from '@nestjs/common';
import { ChatService } from '@/chat/chat.service';
import { ChatController } from '@/chat/chat.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
