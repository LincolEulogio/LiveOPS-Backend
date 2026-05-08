import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { OverlaysService } from '@/overlays/overlays.service';
import { CreateOverlayDto, UpdateOverlayDto } from '@/overlays/dto/overlay.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('productions/:productionId/overlays')
@Protected()
export class OverlaysController {
  constructor(private readonly overlaysService: OverlaysService) {}

  @Post()
  @Permissions('overlay:manage')
  create(
    @Param('productionId') productionId: string,
    @Body() dto: CreateOverlayDto,
  ) {
    return this.overlaysService.create(productionId, dto);
  }

  @Get()
  @Permissions('production:view')
  findAll(@Param('productionId') productionId: string) {
    return this.overlaysService.findAll(productionId);
  }

  @Get(':id')
  @Permissions('production:view')
  findOne(@Param('id') id: string) {
    return this.overlaysService.findOne(id);
  }

  @Patch(':id')
  @Permissions('overlay:manage')
  update(@Param('id') id: string, @Body() dto: UpdateOverlayDto) {
    return this.overlaysService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('overlay:manage')
  remove(@Param('id') id: string) {
    return this.overlaysService.remove(id);
  }

  @Patch(':id/toggle')
  @Permissions('overlay:manage')
  toggleActive(
    @Param('id') id: string,
    @Param('productionId') productionId: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.overlaysService.toggleActive(id, productionId, isActive);
  }
}

