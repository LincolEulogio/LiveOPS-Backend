import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ProductionsService } from './productions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productions')
export class ProductionsController {
    constructor(private readonly productionsService: ProductionsService) { }

    @Post()
    @Permissions('production:create')
    create(@Req() req: any, @Body() dto: CreateProductionDto) {
        return this.productionsService.create(req.user.userId, dto);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.productionsService.findAllForUser(req.user.userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: any) {
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
}
