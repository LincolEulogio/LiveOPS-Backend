import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { VmixService } from './vmix.service';
import { SaveVmixConnectionDto, ChangeInputDto } from './dto/vmix.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/vmix')
export class VmixController {
    constructor(private readonly vmixService: VmixService) { }

    @Put('connection')
    saveConnection(
        @Param('productionId') productionId: string,
        @Body() dto: SaveVmixConnectionDto
    ) {
        return this.vmixService.saveConnection(productionId, dto);
    }

    @Get('connection')
    getConnection(@Param('productionId') productionId: string) {
        return this.vmixService.getConnection(productionId);
    }

    // --- Commands ---

    @Post('input')
    changeInput(
        @Param('productionId') productionId: string,
        @Body() dto: ChangeInputDto
    ) {
        return this.vmixService.changeInput(productionId, dto);
    }

    @Post('transition/cut')
    cut(@Param('productionId') productionId: string) {
        return this.vmixService.cut(productionId);
    }

    @Post('transition/fade')
    fade(@Param('productionId') productionId: string) {
        return this.vmixService.fade(productionId);
    }
}
