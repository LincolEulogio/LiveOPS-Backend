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
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { ProductionsService } from '@/productions/productions.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/constants/roles.enum';
import {
  CreateProductionDto,
  UpdateProductionDto,
  UpdateProductionStateDto,
  AssignUserDto,
  GetProductionsQueryDto,
  PaginationQueryDto,
  CloneProductionDto,
  SaveAsTemplateDto,
  CreateFromTemplateDto,
} from '@/productions/dto/production.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId: string;
  };
}

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('productions')
export class ProductionsController {
  private readonly logger = new Logger(ProductionsController.name);

  constructor(
    private readonly productionsService: ProductionsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:create')
  async create(@Req() req: RequestWithUser, @Body() dto: CreateProductionDto) {
    const result = await this.productionsService.create(req.user.userId, dto);
    await this.cacheManager.del('productions_list');
    return result;
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
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductionDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.productionsService.update(id, dto, req.user.userId);
    await this.cacheManager.del('productions_list');
    return result;
  }

  @Patch(':id/state')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:manage')
  updateState(@Param('id') id: string, @Body() dto: UpdateProductionStateDto) {
    return this.productionsService.updateState(id, dto);
  }

  @Post(':id/users')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:manage')
  assignUser(@Param('id') id: string, @Body() dto: AssignUserDto) {
    return this.productionsService.assignUser(id, dto);
  }

  @Patch(':id/users/:userId/role')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:manage')
  updateRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('roleName') roleName: string,
  ) {
    return this.productionsService.updateUserRole(id, userId, roleName);
  }

  @Delete(':id/users/:userId')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:manage')
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.productionsService.removeUser(id, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:manage')
  async remove(@Param('id') id: string) {
    this.logger.log(`Handling delete request for production: ${id}`);
    const result = await this.productionsService.remove(id);
    await this.cacheManager.del('productions_list');
    return result;
  }

  @Post(':id/clone')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:create')
  async clone(
    @Param('id') id: string,
    @Body() dto: CloneProductionDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.productionsService.cloneProduction(id, req.user.userId, dto);
    await this.cacheManager.del('productions_list');
    return result;
  }

  @Post(':id/save-as-template')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:manage')
  saveAsTemplate(
    @Param('id') id: string,
    @Body() dto: SaveAsTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productionsService.saveAsTemplate(id, req.user.userId, dto);
  }

  @Get('templates/list')
  listTemplates(@Req() req: RequestWithUser) {
    return this.productionsService.listTemplates(req.user.userId);
  }

  @Post('from-template/:templateId')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Permissions('production:create')
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: CreateFromTemplateDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.productionsService.createFromTemplate(templateId, req.user.userId, dto);
    await this.cacheManager.del('productions_list');
    return result;
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.productionsService.getHistory(id, query);
  }
}
