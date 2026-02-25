import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AutomationService } from '@/automation/automation.service';
import { CreateRuleDto, UpdateRuleDto } from '@/automation/dto/automation.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) { }

  @Get('rules')
  @Permissions('automation:view')
  getRules(@Param('productionId') productionId: string) {
    return this.automationService.getRules(productionId);
  }

  @Post('rules')
  @Permissions('automation:manage')
  createRule(
    @Param('productionId') productionId: string,
    @Body() dto: CreateRuleDto,
  ) {
    return this.automationService.createRule(productionId, dto);
  }

  @Get('rules/:id')
  @Permissions('automation:view')
  getRule(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.automationService.getRule(id, productionId);
  }

  @Put('rules/:id')
  @Permissions('automation:manage')
  updateRule(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.automationService.updateRule(id, productionId, dto);
  }

  @Delete('rules/:id')
  @Permissions('automation:manage')
  deleteRule(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.automationService.deleteRule(id, productionId);
  }

  @Get('logs')
  @Permissions('automation:view')
  getExecutionLogs(@Param('productionId') productionId: string) {
    return this.automationService.getExecutionLogs(productionId);
  }

  @Post('instant-clip')
  @Permissions('automation:manage')
  triggerInstantClip(@Param('productionId') productionId: string) {
    // We can use the event emitter to trigger the engine or call a specific method in a new service
    // For now, let's add a method to automation.service.ts
    return this.automationService.triggerInstantClip(productionId);
  }
}
