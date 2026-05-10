import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
import { Prisma } from '@prisma/client';

export interface SocialMessagePayload {
  productionId: string;
  platform: string;
  author: string;
  avatarUrl?: string;
  content: string;
  externalId?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export type MessageStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_AIR';

const VALID_STATUSES = new Set<MessageStatus>([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ON_AIR',
]);

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  private blacklists = new Map<string, string[]>(); // productionId -> blocked words

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private aiService: AiService,
  ) {
    this.blacklists.set('default', ['spam', 'buy followers', 'scam']);
  }

  setBlacklist(productionId: string, words: string[]) {
    this.blacklists.set(
      productionId,
      words.map((w) => w.toLowerCase()),
    );
  }

  getBlacklist(productionId: string): string[] {
    return this.blacklists.get(productionId) || [];
  }

  async ingestMessage(productionId: string, payload: SocialMessagePayload) {
    const blacklist = this.getBlacklist(productionId);

    const isClean = !blacklist.some((word) =>
      payload.content.toLowerCase().includes(word),
    );

    let aiSentiment = 'NEUTRAL';
    let aiCategory = 'COMENTARIO';
    let isToxic = false;

    try {
      const aiResult = await this.aiService.analyzeSocialMessage(
        payload.content,
      );
      aiSentiment = aiResult.sentiment;
      aiCategory = aiResult.category;
      isToxic = aiResult.isToxic;
    } catch {
      this.logger.warn('AI social analysis failed, continuing with defaults');
    }

    const status: MessageStatus = !isClean || isToxic ? 'REJECTED' : 'PENDING';

    const message = await this.prisma.socialMessage.create({
      data: {
        productionId,
        platform: payload.platform,
        author: payload.author,
        authorAvatar: payload.avatarUrl,
        content: payload.content,
        externalId: payload.externalId,
        status,
        aiSentiment,
        aiCategory,
      },
    });

    this.eventEmitter.emit('social.message.new', message);

    if (!isClean) {
      this.logger.debug(
        `Message rejected due to blacklist: ${message.content}`,
      );
    }

    return message;
  }

  async getMessages(
    productionId: string,
    status?: string,
    limit = 100,
    offset = 0,
  ) {
    return this.prisma.socialMessage.findMany({
      where: {
        productionId,
        ...(status ? { status } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
    });
  }

  async updateMessageStatus(
    productionId: string,
    messageId: string,
    status: string,
  ) {
    if (!VALID_STATUSES.has(status as MessageStatus)) {
      throw new BadRequestException(
        `Invalid status "${status}". Must be one of: ${[...VALID_STATUSES].join(', ')}`,
      );
    }

    if (status === 'ON_AIR') {
      await this.prisma.socialMessage.updateMany({
        where: { productionId, status: 'ON_AIR' },
        data: { status: 'APPROVED' },
      });
    }

    const message = await this.prisma.socialMessage.update({
      where: { id: messageId },
      data: { status },
    });

    this.eventEmitter.emit('social.message.updated', message);

    if (status === 'ON_AIR') {
      this.eventEmitter.emit('graphics.social.show', message);

      this.eventEmitter.emit('overlay.broadcast_data', {
        productionId,
        data: {
          latest_comment_author: message.author,
          latest_comment_content: message.content,
          latest_comment_platform: message.platform,
          latest_comment_avatar: message.authorAvatar || '',
        },
      });
    } else if (
      status === 'APPROVED' ||
      status === 'REJECTED' ||
      status === 'PENDING'
    ) {
      this.eventEmitter.emit('graphics.social.hide', { productionId });
    }

    return message;
  }

  async createPoll(productionId: string, question: string, options: string[]) {
    await this.prisma.socialPoll.updateMany({
      where: { productionId, isActive: true },
      data: { isActive: false },
    });

    const pollOptions: PollOption[] = options.map((opt, index) => ({
      id: `opt-${index}`,
      text: opt,
      votes: 0,
    }));

    const poll = await this.prisma.socialPoll.create({
      data: {
        productionId,
        question,
        options: pollOptions,
        isActive: true,
      },
    });

    this.eventEmitter.emit('social.poll.created', poll);
    return poll;
  }

  async getActivePoll(productionId: string) {
    return this.prisma.socialPoll.findFirst({
      where: { productionId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async votePoll(pollId: string, optionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const poll = await tx.socialPoll.findUnique({
        where: { id: pollId },
      });

      if (!poll || !poll.isActive) {
        throw new NotFoundException('Poll not found or inactive');
      }

      const options = poll.options as unknown as PollOption[];
      const option = options.find((o) => o.id === optionId);

      if (!option) {
        throw new NotFoundException('Option not found');
      }

      option.votes += 1;
      const updatedPoll = await tx.socialPoll.update({
        where: { id: pollId },
        data: { options: options as unknown as Prisma.InputJsonValue },
      });

      this.eventEmitter.emit('social.poll.updated', updatedPoll);
      return updatedPoll;
    });
  }

  async closePoll(productionId: string, pollId: string) {
    const poll = await this.prisma.socialPoll.update({
      where: { id: pollId },
      data: { isActive: false },
    });

    this.eventEmitter.emit('social.poll.closed', poll);
    return poll;
  }

  async getAiHighlights(productionId: string) {
    const messages = await this.getMessages(productionId, 'APPROVED');
    return this.aiService.suggestSocialHighlights(messages);
  }
}
