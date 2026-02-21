import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('streaming')
export class StreamingController {
    constructor(private readonly streamingService: StreamingService) { }

    @Get(':id/state')
    getState(@Param('id') productionId: string) {
        return this.streamingService.getStreamingState(productionId);
    }

    @Post(':id/command')
    sendCommand(
        @Param('id') productionId: string,
        @Body() dto: StreamingCommandDto,
    ) {
        return this.streamingService.handleCommand(productionId, dto);
    }
}
