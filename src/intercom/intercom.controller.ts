import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Request,
} from '@nestjs/common';
import { IntercomService } from '@/intercom/intercom.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CreateCommandTemplateDto } from '@/intercom/dto/intercom.dto';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/intercom')
export class IntercomController {
  constructor(private readonly intercomService: IntercomService) { }

  @Post('templates')
  @Permissions('intercom:manage')
  createTemplate(
    @Param('productionId') productionId: string,
    @Body() dto: CreateCommandTemplateDto,
  ) {
    return this.intercomService.createTemplate(productionId, dto);
  }

  @Get('templates')
  @Permissions('intercom:view')
  getTemplates(@Param('productionId') productionId: string) {
    return this.intercomService.getTemplates(productionId);
  }

  @Put('templates/:id')
  @Permissions('intercom:manage')
  updateTemplate(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommandTemplateDto,
  ) {
    return this.intercomService.updateTemplate(id, productionId, dto);
  }

  @Delete('templates/:id')
  @Permissions('intercom:manage')
  deleteTemplate(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.intercomService.deleteTemplate(id, productionId);
  }

  @Get('history')
  @Permissions('intercom:view')
  getCommandHistory(@Param('productionId') productionId: string) {
    return this.intercomService.getCommandHistory(productionId);
  }
}
