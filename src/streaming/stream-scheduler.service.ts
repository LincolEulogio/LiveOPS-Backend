import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StreamingService } from './streaming.service';

@Injectable()
export class StreamSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamSchedulerService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly TICK_MS = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamingService: StreamingService,
  ) {}

  onModuleInit(): void {
    this.intervalId = setInterval(() => void this.tick(), this.TICK_MS);
    this.logger.log('Stream scheduler started (30s interval)');
  }

  onModuleDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick(): Promise<void> {
    const now = new Date();

    const toStart = await this.prisma.streamSchedule.findMany({
      where: { isEnabled: true, isExecuted: false, scheduledStart: { lte: now } },
    });

    for (const schedule of toStart) {
      try {
        await this.streamingService.startCloudStream(schedule.productionId, schedule.layout ?? undefined);
        await this.prisma.streamSchedule.update({
          where: { id: schedule.id },
          data: { isExecuted: true },
        });
        this.logger.log(`Scheduler: started cloud stream for production ${schedule.productionId}`);
      } catch (err) {
        this.logger.warn(
          `Scheduler: could not start stream for ${schedule.productionId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const toStop = await this.prisma.streamSchedule.findMany({
      where: {
        isEnabled: true,
        isExecuted: true,
        scheduledEnd: { lte: now, not: null },
      },
    });

    for (const schedule of toStop) {
      try {
        await this.streamingService.stopCloudStream(schedule.productionId);
        await this.prisma.streamSchedule.update({
          where: { id: schedule.id },
          data: { isEnabled: false },
        });
        this.logger.log(`Scheduler: stopped cloud stream for production ${schedule.productionId}`);
      } catch (err) {
        this.logger.warn(
          `Scheduler: could not stop stream for ${schedule.productionId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
