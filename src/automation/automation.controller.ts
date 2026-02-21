import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/automation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/automation')
export class AutomationController {
    constructor(private readonly automationService: AutomationService) { }

    @Get('rules')
    getRules(@Param('productionId') productionId: string) {
        return this.automationService.getRules(productionId);
    }

    @Post('rules')
    createRule(
        @Param('productionId') productionId: string,
        @Body() dto: CreateRuleDto
    ) {
        return this.automationService.createRule(productionId, dto);
    }

    @Get('rules/:id')
    getRule(
        @Param('productionId') productionId: string,
        @Param('id') id: string
    ) {
        return this.automationService.getRule(id, productionId);
    }

    @Put('rules/:id')
    updateRule(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() dto: UpdateRuleDto
    ) {
        return this.automationService.updateRule(id, productionId, dto);
    }

    @Delete('rules/:id')
    deleteRule(
        @Param('productionId') productionId: string,
        @Param('id') id: string
    ) {
        return this.automationService.deleteRule(id, productionId);
    }

    @Get('logs')
    getExecutionLogs(@Param('productionId') productionId: string) {
        return this.automationService.getExecutionLogs(productionId);
    }
}
