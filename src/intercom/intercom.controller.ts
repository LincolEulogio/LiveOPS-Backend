import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { IntercomService } from '@/intercom/intercom.service';
import { CreateCommandTemplateDto } from '@/intercom/dto/intercom.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Protected()
@Controller('productions/:productionId/intercom')
export class IntercomController {
  constructor(private readonly intercomService: IntercomService) {}

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

  @Get('ai-summary')
  @Permissions('intercom:view')
  getAiSummary(@Param('productionId') productionId: string) {
    return this.intercomService.getAiSummary(productionId);
  }
}

