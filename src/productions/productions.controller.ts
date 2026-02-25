import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  Query,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ProductionsService } from '@/productions/productions.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import {
  CreateProductionDto,
  UpdateProductionDto,
  UpdateProductionStateDto,
  AssignUserDto,
  GetProductionsQueryDto,
} from '@/productions/dto/production.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId: string;
  };
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions')
export class ProductionsController {
  private readonly logger = new Logger(ProductionsController.name);

  constructor(private readonly productionsService: ProductionsService) { }

  @Post()
  @Permissions('production:create')
  create(@Req() req: RequestWithUser, @Body() dto: CreateProductionDto) {
    return this.productionsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: RequestWithUser, @Query() query: GetProductionsQueryDto) {
    return this.productionsService.findAllForUser(req.user.userId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.productionsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @Permissions('production:manage')
  update(@Param('id') id: string, @Body() dto: UpdateProductionDto) {
    return this.productionsService.update(id, dto);
  }

  @Patch(':id/state')
  @Permissions('production:manage')
  updateState(@Param('id') id: string, @Body() dto: UpdateProductionStateDto) {
    return this.productionsService.updateState(id, dto);
  }

  @Post(':id/users')
  @Permissions('production:manage')
  assignUser(@Param('id') id: string, @Body() dto: AssignUserDto) {
    return this.productionsService.assignUser(id, dto);
  }

  @Delete(':id/users/:userId')
  @Permissions('production:manage')
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.productionsService.removeUser(id, userId);
  }

  @Delete(':id')
  @Permissions('production:manage')
  remove(@Param('id') id: string) {
    this.logger.log(`Handling delete request for production: ${id}`);
    return this.productionsService.remove(id);
  }
}
