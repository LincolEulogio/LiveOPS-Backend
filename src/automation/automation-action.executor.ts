import { Injectable, Logger } from '@nestjs/common';
import { Action } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ObsService } from '@/obs/obs.service';
import { VmixService } from '@/vmix/vmix.service';
import { IntercomService } from '@/intercom/intercom.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { ActionPayload, RuleWithActions } from './automation-engine.types';

@Injectable()
export class AutomationActionExecutor {
  private readonly logger = new Logger(AutomationActionExecutor.name);

  constructor(
    private prisma: PrismaService,
    private obsService: ObsService,
    private vmixService: VmixService,
    private intercomService: IntercomService,
    private notificationsService: NotificationsService,
  ) {}

  async executeAction(action: Action, rule: RuleWithActions): Promise<void> {
    this.logger.debug(`Executing action ${action.actionType} (order: ${action.order})`);
    const payload = action.payload as unknown as ActionPayload;

    try {
      switch (action.actionType) {
        case 'obs.changeScene':
          if (payload?.sceneName) {
            await this.obsService.changeScene(rule.productionId, payload.sceneName as string);
          }
          break;

        case 'vmix.cut':
          await this.vmixService.cut(rule.productionId);
          break;

        case 'vmix.fade':
          await this.vmixService.fade(
            rule.productionId,
            (payload?.duration as number) || 500,
          );
          break;

        case 'vmix.changeInput':
          if (payload?.input) {
            await this.vmixService.changeInput(rule.productionId, payload.input as number);
          }
          break;

        case 'intercom.send':
          if (payload?.templateId || payload?.message) {
            let message = payload.message as string | undefined;
            if (!message && payload.templateId) {
              const template = await this.prisma.commandTemplate.findUnique({
                where: { id: payload.templateId as string },
              });
              message = template?.name || 'Automation Alert';
            }
            await this.intercomService.sendCommand({
              productionId: rule.productionId,
              senderId: '00000000-0000-0000-0000-000000000000',
              targetRoleId: payload?.targetRoleId as string,
              templateId: payload?.templateId as string,
              message: message ?? '',
              requiresAck: (payload?.requiresAck as boolean) ?? true,
            });
          }
          break;

        case 'webhook.call':
          if (payload?.url || payload?.message) {
            await this.notificationsService.sendNotification(
              rule.productionId,
              (payload.message as string) || `Automation Rule Triggered: ${rule.name}`,
            );
          }
          break;

        case 'engine.instantClip':
          try {
            if (this.obsService.isConnected(rule.productionId)) {
              await this.obsService.saveReplayBuffer(rule.productionId);
            } else if (this.vmixService.isConnected(rule.productionId)) {
              await this.vmixService.saveVideoDelay(rule.productionId);
            }
          } catch (e: unknown) {
            this.logger.error(
              `Failed to trigger instant clip: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
          break;

        default:
          this.logger.warn(`Unknown action type: ${action.actionType}`);
      }
    } catch (actionError: unknown) {
      this.logger.error(
        `Action ${action.actionType} failed: ${actionError instanceof Error ? actionError.message : String(actionError)}`,
      );
      throw actionError;
    }
  }
}
