import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ObsService } from './obs.service';
import { SaveObsConnectionDto, ChangeSceneDto } from './dto/obs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/obs')
export class ObsController {
  constructor(private readonly obsService: ObsService) { }

  @Put('connection')
  @Permissions('obs:manage')
  saveConnection(
    @Param('productionId') productionId: string,
    @Body() dto: SaveObsConnectionDto,
  ) {
    // Requires production admin role IRL
    return this.obsService.saveConnection(productionId, dto);
  }

  @Get('connection')
  @Permissions('obs:view')
  getConnection(@Param('productionId') productionId: string) {
    return this.obsService.getConnection(productionId);
  }

  // --- Commands ---

  @Post('scene')
  @Permissions('obs:control')
  changeScene(
    @Param('productionId') productionId: string,
    @Body() dto: ChangeSceneDto,
  ) {
    return this.obsService.changeScene(productionId, dto);
  }

  @Post('stream/start')
  @Permissions('obs:control')
  startStream(@Param('productionId') productionId: string) {
    return this.obsService.startStream(productionId);
  }

  @Post('stream/stop')
  @Permissions('obs:control')
  stopStream(@Param('productionId') productionId: string) {
    return this.obsService.stopStream(productionId);
  }
}
