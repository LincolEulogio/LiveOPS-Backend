import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PermissionAction, StandardRoles } from './common/constants/rbac.constants';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    await this.seedRbac();
  }

  getHello(): string {
    return 'Hello World!';
  }

  private async seedRbac() {
    this.logger.log('Checking RBAC synchronization...');
    try {
      // 1. Ensure all permissions exist
      const permissionActions = Object.values(PermissionAction);
      for (const action of permissionActions) {
        await this.prisma.permission.upsert({
          where: { action },
          update: {},
          create: { action, description: `Permission for ${action}` },
        });
      }

      // 2. Ensure standard roles exist and have correct permissions
      for (const [roleKey, roleData] of Object.entries(StandardRoles)) {
        const role = await this.prisma.role.upsert({
          where: { name: roleData.name },
          update: { description: roleData.description },
          create: {
            name: roleData.name,
            description: roleData.description
          },
        });

        // Get matching permission records
        const permissions = await this.prisma.permission.findMany({
          where: { action: { in: roleData.permissions } },
        });

        // Sync RolePermissions
        for (const p of permissions) {
          await this.prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: p.id
              }
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: p.id
            }
          });
        }
      }
      this.logger.log('RBAC synchronization complete.');
    } catch (error) {
      this.logger.error('Failed to sync RBAC:', error);
    }
  }
}
