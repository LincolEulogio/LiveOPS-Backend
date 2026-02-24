import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { VmixService } from './vmix.service';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/vmix')
export class VmixController {
  constructor(private readonly vmixService: VmixService) { }

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
    return this.vmixService.changeInput(productionId, dto);
  }

  @Post('transition/cut')
  @Permissions('vmix:control')
  cut(@Param('productionId') productionId: string) {
    return this.vmixService.cut(productionId);
  }

  @Post('transition/fade')
  @Permissions('vmix:control')
  fade(@Param('productionId') productionId: string) {
    return this.vmixService.fade(productionId);
  }
}
