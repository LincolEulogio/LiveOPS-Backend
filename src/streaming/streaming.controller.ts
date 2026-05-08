import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { StreamingService } from '@/streaming/streaming.service';
import { StreamingDestinationsService } from '@/streaming/streaming-destinations.service';
import { StreamingCommandDto } from '@/streaming/dto/streaming-command.dto';
import {
  CreateStreamingDestinationDto,
  UpdateStreamingDestinationDto,
} from '@/streaming/dto/streaming-destination.dto';
import { Permissions } from '@/common/decorators/permissions.decorator';

import { LiveKitService } from '@/streaming/livekit.service';

import { SkipThrottle } from '@nestjs/throttler';

@Protected()
@Controller('streaming')
export class StreamingController {
  constructor(
    private readonly streamingService: StreamingService,
    private readonly destinationsService: StreamingDestinationsService,
    private readonly liveKitService: LiveKitService,
  ) {}

  @Post(':id/token')
  @Permissions('streaming:control')
  async getToken(
    @Param('id') productionId: string,
    @Body('identity') identity: string,
    @Body('name') name: string,
    @Body('isOperator') isOperator?: boolean,
  ) {
    const roomName = `production_${productionId}`;
    const token = await this.liveKitService.generateToken(
      roomName,
      identity,
      name,
      { isOperator },
    );
    return { token, url: this.liveKitService.getLiveKitUrl() };
  }

  @Get(':id/state')
  @Permissions('streaming:view')
  getState(@Param('id') productionId: string) {
    return this.streamingService.getStreamingState(productionId);
  }

  @SkipThrottle()
  @Post(':id/command')
  @Permissions('streaming:control')
  sendCommand(
    @Param('id') productionId: string,
    @Body() dto: StreamingCommandDto,
  ) {
    return this.streamingService.handleCommand(productionId, dto);
  }

  // --- Destination Management --- //

  @Get(':id/destinations')
  @Permissions('streaming:view')
  getDestinations(@Param('id') productionId: string) {
    return this.destinationsService.findAll(productionId);
  }

  @Post(':id/destinations')
  @Permissions('streaming:manage')
  createDestination(
    @Param('id') productionId: string,
    @Body() dto: CreateStreamingDestinationDto,
  ) {
    return this.destinationsService.create(productionId, dto);
  }

  @Put('destinations/:destId')
  @Permissions('streaming:manage')
  updateDestination(
    @Param('destId') id: string,
    @Body() dto: UpdateStreamingDestinationDto,
  ) {
    return this.destinationsService.update(id, dto);
  }

  @Delete('destinations/:destId')
  @Permissions('streaming:manage')
  removeDestination(@Param('destId') id: string) {
    return this.destinationsService.remove(id);
  }

  // --- Cloud Mixing (RTMP Egress) --- //

  @Post(':id/start-cloud')
  @Permissions('streaming:control')
  startCloudStream(
    @Param('id') productionId: string,
    @Body('layout') layout?: string,
  ) {
    return this.streamingService.startCloudStream(productionId, layout);
  }

  @Post(':id/stop-cloud')
  @Permissions('streaming:control')
  stopCloudStream(@Param('id') productionId: string) {
    return this.streamingService.stopCloudStream(productionId);
  }
}

