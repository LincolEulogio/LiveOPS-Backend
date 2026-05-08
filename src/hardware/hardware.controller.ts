import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { HardwareService } from '@/hardware/hardware.service';
import { CreateHardwareMappingDto } from '@/hardware/dto/hardware-mapping.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('productions/:productionId/hardware')
@Protected()
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Get('mappings')
  @Permissions('hardware:view')
  async getMappings(@Param('productionId') productionId: string) {
    return this.hardwareService.getMappings(productionId);
  }

  @Post('mappings')
  @Permissions('hardware:manage')
  async saveMapping(
    @Param('productionId') productionId: string,
    @Body() dto: CreateHardwareMappingDto,
  ) {
    return this.hardwareService.saveMapping(productionId, dto);
  }

  @Delete('mappings/:mapKey')
  @Permissions('hardware:manage')
  async deleteMapping(
    @Param('productionId') productionId: string,
    @Param('mapKey') mapKey: string,
  ) {
    return this.hardwareService.deleteMapping(productionId, mapKey);
  }
}

