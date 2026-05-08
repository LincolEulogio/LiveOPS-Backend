import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

export const Protected = () =>
  applyDecorators(UseGuards(JwtAuthGuard, PermissionsGuard));
