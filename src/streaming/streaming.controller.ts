import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { StreamingService } from '@/streaming/streaming.service';
import { StreamingDestinationsService } from '@/streaming/streaming-destinations.service';
import { SrsService } from '@/streaming/srs/srs.service';
import { StreamingCommandDto } from '@/streaming/dto/streaming-command.dto';
import {
  CreateStreamingDestinationDto,
  UpdateStreamingDestinationDto,
} from '@/streaming/dto/streaming-destination.dto';
import {
  CreateStreamScheduleDto,
  UpdateStreamScheduleDto,
} from '@/streaming/dto/stream-schedule.dto';
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
    private readonly srsService: SrsService,
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

  @Patch('destinations/:destId/toggle')
  @Permissions('streaming:manage')
  toggleDestination(
    @Param('destId') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.destinationsService.toggleActive(id, isActive);
  }

  // --- Cloud Mixing & Recording --- //

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

  @Post(':id/start-recording')
  @Permissions('streaming:control')
  startCloudRecording(
    @Param('id') productionId: string,
    @Body('layout') layout?: string,
  ) {
    return this.streamingService.startCloudRecording(productionId, layout);
  }

  @Post(':id/stop-recording')
  @Permissions('streaming:control')
  stopCloudRecording(@Param('id') productionId: string) {
    return this.streamingService.stopCloudRecording(productionId);
  }

  // --- Stream Schedules --- //

  @Get(':id/schedules')
  @Permissions('streaming:view')
  getSchedules(@Param('id') productionId: string) {
    return this.streamingService.getSchedules(productionId);
  }

  @Post(':id/schedules')
  @Permissions('streaming:manage')
  createSchedule(
    @Param('id') productionId: string,
    @Body() dto: CreateStreamScheduleDto,
  ) {
    return this.streamingService.createSchedule(productionId, dto);
  }

  @Patch('schedules/:scheduleId')
  @Permissions('streaming:manage')
  updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateStreamScheduleDto,
  ) {
    return this.streamingService.updateSchedule(scheduleId, dto);
  }

  @Delete('schedules/:scheduleId')
  @Permissions('streaming:manage')
  deleteSchedule(@Param('scheduleId') scheduleId: string) {
    return this.streamingService.deleteSchedule(scheduleId);
  }

  // ── SRS Hub ─────────────────────────────────────────────────────────────────

  /** Returns RTMP ingest URL, HLS URL, live metrics, and hub status */
  @Get(':id/srs/status')
  @Permissions('streaming:view')
  getSrsStatus(@Param('id') productionId: string) {
    return this.streamingService.getSrsHubStatus(productionId);
  }

  /** Start fan-out hub: pulls enabled destinations from DB and spawns FFmpeg */
  @Post(':id/srs/start')
  @Permissions('streaming:control')
  startSrsHub(@Param('id') productionId: string) {
    return this.streamingService.startSrsHub(productionId);
  }

  /** Stop fan-out hub and kill all FFmpeg forwarding processes */
  @Post(':id/srs/stop')
  @Permissions('streaming:control')
  stopSrsHub(@Param('id') productionId: string) {
    return this.streamingService.stopSrsHub(productionId);
  }

  /** Live stream metrics from SRS REST API (bitrate, clients, resolution) */
  @SkipThrottle()
  @Get(':id/srs/metrics')
  @Permissions('streaming:view')
  getSrsMetrics(@Param('id') productionId: string) {
    return this.srsService.getStreamMetrics(productionId);
  }

}
