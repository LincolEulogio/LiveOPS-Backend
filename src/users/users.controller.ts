import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from './dto/users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Permissions('user:manage')
    findAllUsers() {
        return this.usersService.findAllUsers();
    }

    @Post()
    @Permissions('user:manage')
    createUser(@Body() dto: CreateUserDto) {
        return this.usersService.createUser(dto);
    }

    @Patch(':id')
    @Permissions('user:manage')
    updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.updateUser(id, dto);
    }

    @Delete(':id')
    @Permissions('user:manage')
    deleteUser(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }

    @Get('roles')
    @Permissions('role:manage')
    findAllRoles() {
        return this.usersService.findAllRoles();
    }

    @Post('roles')
    @Permissions('role:manage')
    createRole(@Body() dto: CreateRoleDto) {
        return this.usersService.createRole(dto);
    }

    @Patch('roles/:id')
    @Permissions('role:manage')
    updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
        return this.usersService.updateRole(id, dto);
    }

    @Post('roles/:id/permissions')
    @Permissions('role:manage')
    updateRolePermissions(@Param('id') id: string, @Body() data: { permissionIds: string[] }) {
        return this.usersService.updateRolePermissions(id, data.permissionIds);
    }

    @Delete('roles/:id')
    @Permissions('role:manage')
    deleteRole(@Param('id') id: string) {
        return this.usersService.deleteRole(id);
    }

    @Get('permissions')
    @Permissions('role:manage')
    findAllPermissions() {
        return this.usersService.findAllPermissions();
    }
}
