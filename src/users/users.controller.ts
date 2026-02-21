import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto } from './dto/users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard) // Will require valid tokens
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAllUsers() {
        return this.usersService.findAllUsers();
    }

    @Post()
    createUser(@Body() dto: CreateUserDto) {
        return this.usersService.createUser(dto);
    }

    @Patch(':id')
    updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.updateUser(id, dto);
    }

    @Delete(':id')
    deleteUser(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }

    @Get('roles')
    findAllRoles() {
        return this.usersService.findAllRoles();
    }

    @Post('roles')
    createRole(@Body() dto: CreateRoleDto) {
        return this.usersService.createRole(dto);
    }

    @Patch('roles/:id')
    updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
        return this.usersService.updateRole(id, dto);
    }

    @Post('roles/:id/permissions')
    updateRolePermissions(@Param('id') id: string, @Body() data: { permissionIds: string[] }) {
        return this.usersService.updateRolePermissions(id, data.permissionIds);
    }

    @Get('permissions')
    findAllPermissions() {
        return this.usersService.findAllPermissions();
    }
}
