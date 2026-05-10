import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { ObsService } from '@/obs/obs.service';
import {
  SaveObsConnectionDto,
  ChangeSceneDto,
  SetTransitionDto,
  SetSceneCollectionDto,
  SetTBarDto,
  SetStudioModeDto,
} from '@/obs/dto/obs.dto';
import { Protected } from '@/common/decorators/protected.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Protected()
@Controller('productions/:productionId/obs')
export class ObsController {
  constructor(private readonly obsService: ObsService) {}

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
    return this.obsService.changeScene(productionId, dto.sceneName);
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

  @Post('record/start')
  @Permissions('obs:control')
  startRecord(@Param('productionId') productionId: string) {
    return this.obsService.startRecord(productionId);
  }

  @Post('record/stop')
  @Permissions('obs:control')
  stopRecord(@Param('productionId') productionId: string) {
    return this.obsService.stopRecord(productionId);
  }

  @Post('replay-buffer/start')
  @Permissions('obs:control')
  startReplayBuffer(@Param('productionId') productionId: string) {
    return this.obsService.startReplayBuffer(productionId);
  }

  @Post('replay-buffer/stop')
  @Permissions('obs:control')
  stopReplayBuffer(@Param('productionId') productionId: string) {
    return this.obsService.stopReplayBuffer(productionId);
  }

  @Post('replay-buffer/save')
  @Permissions('obs:control')
  saveReplayBuffer(@Param('productionId') productionId: string) {
    return this.obsService.saveReplayBuffer(productionId);
  }

  @Post('virtual-cam/start')
  @Permissions('obs:control')
  startVirtualCam(@Param('productionId') productionId: string) {
    return this.obsService.startVirtualCam(productionId);
  }

  @Post('virtual-cam/stop')
  @Permissions('obs:control')
  stopVirtualCam(@Param('productionId') productionId: string) {
    return this.obsService.stopVirtualCam(productionId);
  }

  @Get('scene-collections')
  @Permissions('obs:view')
  getSceneCollections(@Param('productionId') productionId: string) {
    return this.obsService.getSceneCollections(productionId);
  }

  @Put('scene-collections/current')
  @Permissions('obs:control')
  setCurrentSceneCollection(
    @Param('productionId') productionId: string,
    @Body() dto: SetSceneCollectionDto,
  ) {
    return this.obsService.setCurrentSceneCollection(productionId, dto.sceneCollectionName);
  }

  @Get('transitions')
  @Permissions('obs:view')
  getTransitions(@Param('productionId') productionId: string) {
    return this.obsService.getTransitions(productionId);
  }

  @Put('transitions/current')
  @Permissions('obs:control')
  setCurrentTransition(
    @Param('productionId') productionId: string,
    @Body() dto: SetTransitionDto,
  ) {
    return this.obsService.setCurrentTransition(productionId, dto.transitionName, dto.transitionDuration);
  }

  @Post('transitions/trigger')
  @Permissions('obs:control')
  triggerTransition(@Param('productionId') productionId: string) {
    return this.obsService.triggerTransition(productionId);
  }

  @Put('studio-mode')
  @Permissions('obs:control')
  setStudioMode(
    @Param('productionId') productionId: string,
    @Body() dto: SetStudioModeDto,
  ) {
    return this.obsService.setStudioMode(productionId, dto.enabled);
  }

  @Put('tbar')
  @Permissions('obs:control')
  setTBarPosition(
    @Param('productionId') productionId: string,
    @Body() dto: SetTBarDto,
  ) {
    return this.obsService.setTBarPosition(productionId, dto.position);
  }

  @Post('tbar/release')
  @Permissions('obs:control')
  releaseTBar(@Param('productionId') productionId: string) {
    return this.obsService.releaseTBar(productionId);
  }
}
