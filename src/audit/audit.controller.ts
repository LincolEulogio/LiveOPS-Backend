import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditService } from '@/common/services/audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get('global')
    @Permissions('audit:view')
    async getGlobalLogs(
        @Query('limit') limit?: string,
        @Query('page') page?: string,
    ) {
        return this.auditService.getLogs(
            undefined,
            limit ? parseInt(limit) : 100,
            page ? parseInt(page) : 1,
        );
    }

    @Get('production/:productionId')
    @Permissions('production:logs')
    async getProductionLogs(
        @Param('productionId') productionId: string,
        @Query('limit') limit?: string,
        @Query('page') page?: string,
    ) {
        return this.auditService.getLogs(
            productionId,
            limit ? parseInt(limit) : 100,
            page ? parseInt(page) : 1,
        );
    }
}
