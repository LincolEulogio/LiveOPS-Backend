import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Put as HttpPut } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { CreateTimelineBlockDto, UpdateTimelineBlockDto, ReorderBlocksDto } from './dto/timeline.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/timeline')
export class TimelineController {
    constructor(private readonly timelineService: TimelineService) { }

    @Get()
    getBlocks(@Param('productionId') productionId: string) {
        return this.timelineService.getBlocks(productionId);
    }

    @Post()
    createBlock(
        @Param('productionId') productionId: string,
        @Body() dto: CreateTimelineBlockDto
    ) {
        return this.timelineService.createBlock(productionId, dto);
    }

    @Put('reorder')
    reorderBlocks(
        @Param('productionId') productionId: string,
        @Body() dto: ReorderBlocksDto
    ) {
        return this.timelineService.reorderBlocks(productionId, dto.blockIds);
    }

    @Put(':id')
    updateBlock(
        @Param('productionId') productionId: string,
        @Param('id') id: string,
        @Body() dto: UpdateTimelineBlockDto
    ) {
        return this.timelineService.updateBlock(id, productionId, dto);
    }

    @Delete(':id')
    deleteBlock(
        @Param('productionId') productionId: string,
        @Param('id') id: string
    ) {
        return this.timelineService.deleteBlock(id, productionId);
    }

    // --- State Machine Endpoints ---

    @Post(':id/start')
    startBlock(
        @Param('productionId') productionId: string,
        @Param('id') id: string
    ) {
        return this.timelineService.startBlock(id, productionId);
    }

    @Post(':id/complete')
    completeBlock(
        @Param('productionId') productionId: string,
        @Param('id') id: string
    ) {
        return this.timelineService.completeBlock(id, productionId);
    }

    @Post(':id/reset')
    resetBlock(
        @Param('productionId') productionId: string,
        @Param('id') id: string
    ) {
        return this.timelineService.resetBlock(id, productionId);
    }
}
