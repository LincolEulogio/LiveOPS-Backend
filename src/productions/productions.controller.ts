import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ProductionsService } from './productions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateProductionDto, UpdateProductionDto, UpdateProductionStateDto, AssignUserDto } from './dto/production.dto';

@UseGuards(JwtAuthGuard)
@Controller('productions')
export class ProductionsController {
    constructor(private readonly productionsService: ProductionsService) { }

    @Post()
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
    update(@Param('id') id: string, @Body() dto: UpdateProductionDto) {
        return this.productionsService.update(id, dto);
    }

    @Patch(':id/state')
    updateState(@Param('id') id: string, @Body() dto: UpdateProductionStateDto) {
        // In a real app, you'd add @Permissions('production:update') here
        // And validate using the PermissionsGuard
        return this.productionsService.updateState(id, dto);
    }

    @Post(':id/users')
    assignUser(@Param('id') id: string, @Body() dto: AssignUserDto) {
        return this.productionsService.assignUser(id, dto);
    }

    @Delete(':id/users/:userId')
    removeUser(@Param('id') id: string, @Param('userId') userId: string) {
        return this.productionsService.removeUser(id, userId);
    }
}
