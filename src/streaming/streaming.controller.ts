import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingDestinationsService } from './streaming-destinations.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';
import { CreateStreamingDestinationDto, UpdateStreamingDestinationDto } from './dto/streaming-destination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

import { LiveKitService } from './livekit.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('streaming')
export class StreamingController {
  constructor(
    private readonly streamingService: StreamingService,
    private readonly destinationsService: StreamingDestinationsService,
    private readonly liveKitService: LiveKitService,
  ) { }

  @Post(':id/token')
  @Permissions('streaming:control')
  async getToken(
    @Param('id') productionId: string,
    @Body('identity') identity: string,
    @Body('name') name: string,
    @Body('isOperator') isOperator?: boolean,
  ) {
    const token = await this.liveKitService.generateToken(
      productionId,
      identity,
      name,
      isOperator,
    );
    return { token, url: this.liveKitService.getLiveKitUrl() };
  }

  @Get(':id/state')
  @Permissions('streaming:view')
  getState(@Param('id') productionId: string) {
    return this.streamingService.getStreamingState(productionId);
  }

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
}
