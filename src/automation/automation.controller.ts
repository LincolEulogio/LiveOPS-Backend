import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { AutomationService } from '@/automation/automation.service';
import {
  CreateRuleDto,
  UpdateRuleFullDto,
  PaginationQueryDto,
} from '@/automation/dto/automation.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Protected()
@Controller('productions/:productionId/automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('rules')
  @Permissions('automation:view')
  getRules(
    @Param('productionId') productionId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.automationService.getRules(productionId, query);
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
    @Body() dto: UpdateRuleFullDto,
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
  getExecutionLogs(
    @Param('productionId') productionId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.automationService.getExecutionLogs(productionId, query);
  }

  @Post('instant-clip')
  @Permissions('automation:manage')
  triggerInstantClip(@Param('productionId') productionId: string) {
    // We can use the event emitter to trigger the engine or call a specific method in a new service
    // For now, let's add a method to automation.service.ts
    return this.automationService.triggerInstantClip(productionId);
  }

  @Post('rules/:id/trigger')
  @Permissions('automation:manage')
  triggerRule(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.automationService.runRuleManual(productionId, id);
  }

  @Post('ai-generate')
  @Permissions('automation:manage')
  generateRuleAi(
    @Param('productionId') productionId: string,
    @Body('prompt') prompt: string,
  ) {
    return this.automationService.generateRuleAi(productionId, prompt);
  }
}

