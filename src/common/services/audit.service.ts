import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum AuditAction {
  INTERCOM_SEND = 'INTERCOM_SEND',
  STREAM_START = 'STREAM_START',
  STREAM_STOP = 'STREAM_STOP',
  RECORD_START = 'RECORD_START',
  RECORD_STOP = 'RECORD_STOP',
  SCENE_CHANGE = 'SCENE_CHANGE',
  AUTOMATION_TRIGGER = 'AUTOMATION_TRIGGER',
  INSTANT_CLIP = 'INSTANT_CLIP',
  USER_LOGIN = 'USER_LOGIN',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  TIMELINE_START = 'TIMELINE_START',
  TIMELINE_COMPLETE = 'TIMELINE_COMPLETE',
  TIMELINE_RESET = 'TIMELINE_RESET',
  VIRTUAL_CAM_START = 'VIRTUAL_CAM_START',
  VIRTUAL_CAM_STOP = 'VIRTUAL_CAM_STOP',
  REPLAY_BUFFER_START = 'REPLAY_BUFFER_START',
  REPLAY_BUFFER_STOP = 'REPLAY_BUFFER_STOP',
  REPLAY_BUFFER_SAVE = 'REPLAY_BUFFER_SAVE',
  SCENE_COLLECTION_CHANGE = 'SCENE_COLLECTION_CHANGE',
  TRANSITION_CHANGE = 'TRANSITION_CHANGE',
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async log(payload: {
    productionId?: string;
    userId?: string;
    action: AuditAction | string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    try {
      // 1. Log to AuditLog (Global/System Level)
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: payload.action,
          details: payload.details as Prisma.InputJsonValue,
          ipAddress: payload.ipAddress,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      // 2. If productionId is provided, also log to ProductionLog (Show Specific)
      if (payload.productionId) {
        await this.prisma.productionLog.create({
          data: {
            productionId: payload.productionId,
            userId: payload.userId,
            eventType: payload.action,
            details: payload.details as Prisma.InputJsonValue,
          },
        });
      }

      // 3. Emit Real-time event for Analytics Dashboard
      this.eventEmitter.emit('analytics.log', {
        id: auditLog.id,
        productionId: payload.productionId,
        userId: payload.userId,
        eventType: payload.action,
        details: payload.details,
        createdAt: auditLog.createdAt,
        user: auditLog.user,
      });

      this.logger.debug(
        `Audit log created & emitted: ${payload.action} for production ${payload.productionId || 'GLOBAL'}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getLogs(productionId?: string, limit: number = 100, page: number = 1) {
    const skip = (page - 1) * limit;

    if (productionId) {
      return this.prisma.productionLog.findMany({
        where: { productionId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      });
    }

    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
      take: limit,
      skip,
    });
  }
}
