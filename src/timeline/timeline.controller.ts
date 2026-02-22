import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Put as HttpPut,
} from '@nestjs/common';
import { TimelineService } from './timeline.service';
import {
  CreateTimelineBlockDto,
  UpdateTimelineBlockDto,
  ReorderBlocksDto,
} from './dto/timeline.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionAction } from '../common/constants/rbac.constants';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @Permissions(PermissionAction.RUNDOWN_VIEW)
  getBlocks(@Param('productionId') productionId: string) {
    return this.timelineService.getBlocks(productionId);
  }

  @Post()
  @Permissions(PermissionAction.RUNDOWN_EDIT)
  createBlock(
    @Param('productionId') productionId: string,
    @Body() dto: CreateTimelineBlockDto,
  ) {
    return this.timelineService.createBlock(productionId, dto);
  }

  @Put('reorder')
  @Permissions(PermissionAction.RUNDOWN_EDIT)
  reorderBlocks(
    @Param('productionId') productionId: string,
    @Body() dto: ReorderBlocksDto,
  ) {
    return this.timelineService.reorderBlocks(productionId, dto.blockIds);
  }

  @Put(':id')
  @Permissions(PermissionAction.RUNDOWN_EDIT)
  updateBlock(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTimelineBlockDto,
  ) {
    return this.timelineService.updateBlock(id, productionId, dto);
  }

  @Delete(':id')
  @Permissions(PermissionAction.RUNDOWN_EDIT)
  deleteBlock(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.timelineService.deleteBlock(id, productionId);
  }

  // --- State Machine Endpoints ---

  @Post(':id/start')
  @Permissions(PermissionAction.RUNDOWN_CONTROL)
  startBlock(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.timelineService.startBlock(id, productionId);
  }

  @Post(':id/complete')
  @Permissions(PermissionAction.RUNDOWN_CONTROL)
  completeBlock(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.timelineService.completeBlock(id, productionId);
  }

  @Post(':id/reset')
  @Permissions(PermissionAction.RUNDOWN_CONTROL)
  resetBlock(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.timelineService.resetBlock(id, productionId);
  }
}
