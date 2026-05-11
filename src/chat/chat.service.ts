import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(
    productionId: string,
    userId: string | null,
    message: string,
    parentId?: string,
    mentionUserIds: string[] = [],
  ) {
    return this.prisma.chatMessage.create({
      data: {
        productionId,
        userId: userId,
        message,
        parentId: parentId || null,
        mentions: {
          create: mentionUserIds.map((mId) => ({ userId: mId })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        mentions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });
  }

  async getChatHistory(
    productionId: string,
    options: {
      limit?: number;
      before?: string;
      parentId?: string;
      search?: string;
      isPinned?: boolean;
    } = {},
  ) {
    const { limit = 50, before, parentId, search, isPinned } = options;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        productionId,
        parentId:
          parentId === undefined ? (isPinned ? undefined : null) : parentId,
        isPinned: isPinned,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        ...(search
          ? {
              message: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        mentions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
      create: { messageId, userId, emoji },
      update: {},
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.delete({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });
  }

  async togglePin(messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { isPinned: true },
    });
    if (!message) return null;

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
    });
  }
}
