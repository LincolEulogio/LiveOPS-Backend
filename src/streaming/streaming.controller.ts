import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingDestinationsService } from './streaming-destinations.service';
import { StreamingCommandDto } from './dto/streaming-command.dto';
import { CreateStreamingDestinationDto, UpdateStreamingDestinationDto } from './dto/streaming-destination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('streaming')
export class StreamingController {
  constructor(
    private readonly streamingService: StreamingService,
    private readonly destinationsService: StreamingDestinationsService,
  ) { }

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

  // --- Destination Management --- //

  @Get(':id/destinations')
  getDestinations(@Param('id') productionId: string) {
    return this.destinationsService.findAll(productionId);
  }

  @Post(':id/destinations')
  createDestination(
    @Param('id') productionId: string,
    @Body() dto: CreateStreamingDestinationDto,
  ) {
    return this.destinationsService.create(productionId, dto);
  }

  @Put('destinations/:destId')
  updateDestination(
    @Param('destId') id: string,
    @Body() dto: UpdateStreamingDestinationDto,
  ) {
    return this.destinationsService.update(id, dto);
  }

  @Delete('destinations/:destId')
  removeDestination(@Param('destId') id: string) {
    return this.destinationsService.remove(id);
  }
}
