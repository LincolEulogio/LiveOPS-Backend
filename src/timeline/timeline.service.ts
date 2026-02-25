import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateTimelineBlockDto,
  UpdateTimelineBlockDto,
} from '@/timeline/dto/timeline.dto';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) { }

  // --- CRUD Operations --- //

  async getBlocks(productionId: string) {
    return this.prisma.timelineBlock.findMany({
      where: { productionId },
      orderBy: { order: 'asc' },
      include: { intercomTemplate: true },
    });
  }

  async createBlock(productionId: string, dto: CreateTimelineBlockDto) {
    const block = await this.prisma.timelineBlock.create({
      data: {
        productionId,
        ...dto,
      },
    });
    this.emitTimelineUpdated(productionId);
    return block;
  }

  async updateBlock(
    id: string,
    productionId: string,
    dto: UpdateTimelineBlockDto,
  ) {
    const block = await this.prisma.timelineBlock.findFirst({
      where: { id, productionId },
    });
    if (!block) throw new NotFoundException('Block not found');

    const updated = await this.prisma.timelineBlock.update({
      where: { id },
      data: dto,
    });
    this.emitTimelineUpdated(productionId);
    return updated;
  }

  async deleteBlock(id: string, productionId: string) {
    const block = await this.prisma.timelineBlock.findFirst({
      where: { id, productionId },
    });
    if (!block) throw new NotFoundException('Block not found');

    await this.prisma.timelineBlock.delete({ where: { id } });
    this.emitTimelineUpdated(productionId);
    return { success: true };
  }

  async reorderBlocks(productionId: string, blockIds: string[]) {
    // Perform updates in a transaction
    await this.prisma.$transaction(
      blockIds.map((id, index) =>
        this.prisma.timelineBlock.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
    this.emitTimelineUpdated(productionId);
    return { success: true };
  }

  // --- State Machine --- //

  async startBlock(id: string, productionId: string) {
    const block = await this.prisma.timelineBlock.findFirst({
      where: { id, productionId },
      include: { intercomTemplate: true },
    });

    if (!block) throw new NotFoundException('Block not found');
    if (block.status === 'ACTIVE')
      throw new BadRequestException('Block is already active');

    // Optional: Mark currently ACTIVE blocks as COMPLETED
    await this.prisma.timelineBlock.updateMany({
      where: { productionId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', endTime: new Date() },
    });

    const updated = await this.prisma.timelineBlock.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startTime: new Date(),
        endTime: null,
      },
    });

    // Automation: Emit block started event for other services (Tally, OBS, etc)
    this.eventEmitter.emit('timeline.block.started', {
      productionId,
      blockId: block.id,
      linkedScene: block.linkedScene,
    });

    // Broadcast data for Overlays
    this.eventEmitter.emit('overlay.broadcast_data', {
      productionId,
      data: {
        active_block_title: updated.title,
        active_block_notes: updated.notes || '',
        active_block_guest: (updated.notes?.match(/Guest:\s*([^|]*)/) || [])[1]?.trim() || '',
        active_block_duration: updated.durationMs ? `${Math.floor(updated.durationMs / 1000)}s` : '',
      }
    });

    this.emitTimelineUpdated(productionId);
    return updated;
  }

  async completeBlock(id: string, productionId: string) {
    const block = await this.prisma.timelineBlock.findFirst({
      where: { id, productionId },
    });
    if (!block) throw new NotFoundException('Block not found');

    const updated = await this.prisma.timelineBlock.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
    });

    this.emitTimelineUpdated(productionId);
    return updated;
  }

  async resetBlock(id: string, productionId: string) {
    const block = await this.prisma.timelineBlock.findFirst({
      where: { id, productionId },
    });
    if (!block) throw new NotFoundException('Block not found');

    const updated = await this.prisma.timelineBlock.update({
      where: { id },
      data: {
        status: 'PENDING',
        startTime: null,
        endTime: null,
      },
    });

    this.emitTimelineUpdated(productionId);
    return updated;
  }

  // --- Helpers --- //

  private emitTimelineUpdated(productionId: string) {
    this.eventEmitter.emit('timeline.updated', { productionId });
  }
}
