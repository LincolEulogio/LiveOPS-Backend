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
import { IntercomService } from './intercom.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateCommandTemplateDto } from './dto/intercom.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions/:productionId/intercom')
export class IntercomController {
  constructor(private readonly intercomService: IntercomService) {}

  @Post('templates')
  createTemplate(
    @Param('productionId') productionId: string,
    @Body() dto: CreateCommandTemplateDto,
  ) {
    return this.intercomService.createTemplate(productionId, dto);
  }

  @Get('templates')
  getTemplates(@Param('productionId') productionId: string) {
    return this.intercomService.getTemplates(productionId);
  }

  @Put('templates/:id')
  updateTemplate(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommandTemplateDto,
  ) {
    return this.intercomService.updateTemplate(id, productionId, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.intercomService.deleteTemplate(id, productionId);
  }

  @Get('history')
  getCommandHistory(@Param('productionId') productionId: string) {
    return this.intercomService.getCommandHistory(productionId);
  }
}
