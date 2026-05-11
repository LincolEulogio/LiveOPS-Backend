import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { VmixService } from '@/vmix/vmix.service';
import { SaveVmixConnectionDto, ChangeInputDto, TransitionDurationDto } from '@/vmix/dto/vmix.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Protected()
@Controller('productions/:productionId/vmix')
export class VmixController {
  constructor(private readonly vmixService: VmixService) {}

  @Put('connection')
  @Permissions('vmix:manage')
  saveConnection(
    @Param('productionId') productionId: string,
    @Body() dto: SaveVmixConnectionDto,
  ) {
    return this.vmixService.saveConnection(productionId, dto);
  }

  @Get('connection')
  @Permissions('vmix:view')
  getConnection(@Param('productionId') productionId: string) {
    return this.vmixService.getConnection(productionId);
  }

  // --- Commands ---

  @Post('input')
  @Permissions('vmix:control')
  changeInput(
    @Param('productionId') productionId: string,
    @Body() dto: ChangeInputDto,
  ) {
    return this.vmixService.changeInput(productionId, dto.input);
  }

  @Post('transition/cut')
  @Permissions('vmix:control')
  cut(@Param('productionId') productionId: string) {
    return this.vmixService.cut(productionId);
  }

  @Post('transition/fade')
  @Permissions('vmix:control')
  fade(@Param('productionId') productionId: string, @Body() dto: TransitionDurationDto) {
    return this.vmixService.fade(productionId, dto.duration);
  }

  @Post('transition/wipe')
  @Permissions('vmix:control')
  wipe(@Param('productionId') productionId: string, @Body() dto: TransitionDurationDto) {
    return this.vmixService.wipe(productionId, dto.duration);
  }

  @Post('transition/slide')
  @Permissions('vmix:control')
  slide(@Param('productionId') productionId: string, @Body() dto: TransitionDurationDto) {
    return this.vmixService.slide(productionId, dto.duration);
  }

  @Post('transition/merge')
  @Permissions('vmix:control')
  merge(@Param('productionId') productionId: string, @Body() dto: TransitionDurationDto) {
    return this.vmixService.merge(productionId, dto.duration);
  }

  @Post('transition/cross-zoom')
  @Permissions('vmix:control')
  crossZoom(@Param('productionId') productionId: string, @Body() dto: TransitionDurationDto) {
    return this.vmixService.crossZoom(productionId, dto.duration);
  }
}

