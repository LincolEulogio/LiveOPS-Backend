import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { HardwareService } from './hardware.service';
import { CreateHardwareMappingDto } from './dto/hardware-mapping.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('productions/:productionId/hardware')
@UseGuards(JwtAuthGuard)
export class HardwareController {
    constructor(private readonly hardwareService: HardwareService) { }

    @Get('mappings')
    async getMappings(@Param('productionId') productionId: string) {
        return this.hardwareService.getMappings(productionId);
    }

    @Post('mappings')
    async saveMapping(
        @Param('productionId') productionId: string,
        @Body() dto: CreateHardwareMappingDto,
    ) {
        return this.hardwareService.saveMapping(productionId, dto);
    }

    @Delete('mappings/:mapKey')
    async deleteMapping(
        @Param('productionId') productionId: string,
        @Param('mapKey') mapKey: string,
    ) {
        return this.hardwareService.deleteMapping(productionId, mapKey);
    }
}
