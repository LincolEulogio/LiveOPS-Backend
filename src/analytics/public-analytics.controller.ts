import { Controller, Get, Param, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public/productions/:id/status')
export class PublicAnalyticsController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly prisma: PrismaService,
    ) { }

    @Get()
    async getPublicStatus(@Param('id') id: string) {
        const production = await this.prisma.production.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                publicStatusEnabled: true,
                status: true,
                engineType: true,
                timelineBlocks: {
                    where: { status: 'ACTIVE' },
                    take: 1,
                },
            },
        });

        if (!production) {
            throw new NotFoundException('Production not found');
        }

        if (!production.publicStatusEnabled) {
            throw new ForbiddenException('Public status page is disabled for this production');
        }

        // Get latest telemetry (last 5 minutes)
        const telemetry = await this.analyticsService.getTelemetryLogs(id, 5);

        return {
            productionName: production.name,
            status: production.status,
            engineType: production.engineType,
            activeSegment: production.timelineBlocks[0]?.title || 'Intermission',
            telemetry: telemetry.slice(-10), // Last 10 samples for the pulse
        };
    }
}
