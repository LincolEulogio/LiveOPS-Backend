import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  PermissionAction,
  StandardRoles,
} from '@/common/constants/rbac.constants';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }
}
