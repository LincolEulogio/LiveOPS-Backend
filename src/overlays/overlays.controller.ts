import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { OverlaysService } from './overlays.service';
import { CreateOverlayDto, UpdateOverlayDto } from './dto/overlay.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('productions/:productionId/overlays')
@UseGuards(JwtAuthGuard)
export class OverlaysController {
    constructor(private readonly overlaysService: OverlaysService) { }

    @Post()
    create(@Param('productionId') productionId: string, @Body() dto: CreateOverlayDto) {
        return this.overlaysService.create(productionId, dto);
    }

    @Get()
    findAll(@Param('productionId') productionId: string) {
        return this.overlaysService.findAll(productionId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.overlaysService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateOverlayDto) {
        return this.overlaysService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.overlaysService.remove(id);
    }

    @Patch(':id/toggle')
    toggleActive(
        @Param('id') id: string,
        @Param('productionId') productionId: string,
        @Body('isActive') isActive: boolean,
    ) {
        return this.overlaysService.toggleActive(id, productionId, isActive);
    }
}
