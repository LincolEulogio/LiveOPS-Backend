import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { AutomationService } from '@/automation/automation.service';
import {
  CreateRuleDto,
  ImportRulesDto,
  PaginationQueryDto,
  UpdateRuleFullDto,
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

  @Get('rules/export')
  @Permissions('automation:view')
  exportRules(@Param('productionId') productionId: string) {
    return this.automationService.exportRules(productionId);
  }

  @Post('rules/import')
  @Permissions('automation:manage')
  importRules(
    @Param('productionId') productionId: string,
    @Body() dto: ImportRulesDto,
  ) {
    return this.automationService.importRules(productionId, dto);
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

  @Post('rules/:id/trigger')
  @Permissions('automation:manage')
  triggerRule(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.automationService.runRuleManual(productionId, id);
  }

  /** Dry-run: evaluate triggers and list actions without executing anything. */
  @Post('rules/:id/test')
  @Permissions('automation:view')
  dryRunRule(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
    @Body() mockPayload: Record<string, string | number | boolean | null>,
  ) {
    return this.automationService.dryRunRule(id, productionId, mockPayload);
  }

  /** Paginated execution history scoped to a single rule. */
  @Get('rules/:id/logs')
  @Permissions('automation:view')
  getRuleLogs(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.automationService.getRuleLogs(id, productionId, query);
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
    return this.automationService.triggerInstantClip(productionId);
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
