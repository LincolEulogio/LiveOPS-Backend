import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('suggest-script')
    @Permissions('production:manage')
    async suggestScript(
        @Body() body: { title: string; content: string }
    ) {
        const suggestion = await this.aiService.suggestScriptContent(body.title, body.content);
        return { suggestion };
    }

    @Post('generate-briefing')
    @Permissions('production:view')
    async generateBriefing(
        @Body() body: { social: string; telemetry: string; script: string }
    ) {
        const briefing = await this.aiService.generateBriefing(body);
        return { briefing };
    }
}
