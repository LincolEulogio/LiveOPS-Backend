import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Novu } from '@novu/node';

export enum NotificationPlatform {
  DISCORD = 'DISCORD',
  SLACK = 'SLACK',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  GENERIC = 'GENERIC',
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private novu: Novu;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('NOVU_API_KEY');
    if (apiKey) {
      this.novu = new Novu(apiKey);
      this.logger.log('Novu Notification Engine initialized.');
    } else {
      this.logger.warn(
        'NOVU_API_KEY missing. Notifications will be logged but not sent.',
      );
    }
  }

  async sendNotification(
    productionId: string,
    message: string,
    options?: {
      platform?: NotificationPlatform;
      userId?: string;
      title?: string;
      workflowId?: string; // Novu Workflow ID
    },
  ) {
    this.logger.debug(
      `Sending notification for production ${productionId}: ${message}`,
    );

    if (!this.novu) {
      this.logger.warn('Novu not initialized. Skipping delivery.');
      return;
    }

    try {
      // If a specific userId is provided, trigger Novu for that subscriber
      if (options?.userId) {
        await this.triggerNovu(options.userId, message, options.title);
      } else {
        // Broadcast to all production members
        const productionUsers = await this.prisma.productionUser.findMany({
          where: { productionId },
          select: { userId: true },
        });

        await Promise.allSettled(
          productionUsers.map((up) =>
            this.triggerNovu(up.userId, message, options?.title),
          ),
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        `Novu trigger failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async triggerNovu(userId: string, message: string, title?: string) {
    try {
      await this.novu.trigger(
        this.configService.get('NOVU_WORKFLOW_ID') || 'production-alert',
        {
          to: {
            subscriberId: userId,
          },
          payload: {
            message,
            title: title || 'LiveOPS Alert',
            timestamp: new Date().toISOString(),
          },
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to trigger Novu for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
