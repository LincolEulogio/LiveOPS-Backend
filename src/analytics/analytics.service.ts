import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Listen to all events and log them as ProductionLogs if they contain a productionId.
   */
  @OnEvent('**')
  async handleEvent(eventPrefix: string, payload: any) {
    // Ignore high-frequency polling events if any exist (e.g. basic heartbeat)
    if (eventPrefix === 'obs.connection.state' && payload?.connected === true)
      return; // Example filter

    const productionId = payload?.productionId;
    if (!productionId) return;

    try {
      await this.prisma.productionLog.create({
        data: {
          productionId,
          eventType: eventPrefix,
          details: payload,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to log event ${eventPrefix}: ${error.message}`);
    }
  }

  /**
   * Specifically track operator actions like sending and acknowledging commands.
   * This assumes the domain events have userId inside the payload.
   */
  @OnEvent('command.send')
  @OnEvent('command.ack')
  async handleOperatorActivity(eventPrefix: string, payload: any) {
    const productionId = payload?.productionId || payload?.productionId; // Adjust based on your payload
    const userId = payload?.userId; // Assuming user ID is passed

    if (!productionId || !userId) return;

    try {
      await this.prisma.operatorActivity.create({
        data: {
          productionId,
          userId,
          action: eventPrefix,
          details: payload,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to log operator activity ${eventPrefix}: ${error.message}`,
      );
    }
  }

  // --- Querying & Reporting ---

  async getDashboardMetrics(productionId: string) {
    const totalLogs = await this.prisma.productionLog.count({
      where: { productionId },
    });

    // Group logs by eventType
    const eventCounts = await this.prisma.productionLog.groupBy({
      by: ['eventType'],
      where: { productionId },
      _count: true,
    });

    const operatorActions = await this.prisma.operatorActivity.count({
      where: { productionId },
    });

    return {
      productionId,
      totalEvents: totalLogs,
      breakdown: eventCounts,
      totalOperatorActions: operatorActions,
    };
  }

  async getProductionLogs(productionId: string) {
    return this.prisma.productionLog.findMany({
      where: { productionId },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit for standard API response
    });
  }

  async getAllLogsForExport(productionId: string) {
    return this.prisma.productionLog.findMany({
      where: { productionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
