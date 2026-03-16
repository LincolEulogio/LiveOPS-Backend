import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/constants/roles.enum';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest-script')
  @Permissions('production:manage')
  async suggestScript(@Body() body: { title: string; content: string }) {
    const suggestion = await this.aiService.suggestScriptContent(
      body.title,
      body.content,
    );
    return { suggestion };
  }

  @Post('generate-briefing')
  @Permissions('production:view')
  async generateBriefing(
    @Body() body: { social: string; telemetry: string; script: string },
  ) {
    const briefing = await this.aiService.generateBriefing(body);
    return { briefing };
  }

  @Post('chat')
  @Permissions('production:view')
  async chat(
    @Body()
    body: {
      history: { role: 'user' | 'assistant'; content: string }[];
      context: string;
    },
  ) {
    const reply = await this.aiService.chat(body.history, body.context);
    return { reply };
  }

  @Post('chat-stream')
  @Permissions('production:view')
  async streamChat(
    @Res() res: Response,
    @Body()
    body: {
      history: { role: 'user' | 'assistant'; content: string }[];
      context: string;
    },
  ) {
    const result = await this.aiService.streamChat(body.history, body.context);
    result.pipeTextStreamToResponse(res);
  }

  @Post('process-direction')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR)
  @Permissions('production:manage')
  async processDirection(
    @Body() body: { productionId: string; input: string },
  ) {
    return await this.aiService.processDirection(body.productionId, body.input);
  }
}
