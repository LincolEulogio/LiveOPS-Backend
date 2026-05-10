import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { NdiService } from './ndi.service';
import { NdiActionDto, NdiToolsType } from './dto/ndi-action.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('ndi')
@UseGuards(JwtAuthGuard)
export class NdiController {
  constructor(private readonly ndiService: NdiService) {}

  @Get('discovery')
  getDiscovery() {
    return this.ndiService.getDiscoveryOverview();
  }

  @Get('sources')
  getSources() {
    return this.ndiService.getSources();
  }

  @Post('sources')
  addSource(@Body() data: { name: string; address: string; type: 'input' | 'output' }) {
    return this.ndiService.addSource(data);
  }

  @Delete('sources/:id')
  removeSource(@Param('id') id: string) {
    return this.ndiService.removeSource(id);
  }

  @Post('remote/generate')
  createRemoteLink() {
    return this.ndiService.generateRemoteLink();
  }

  @Post('router/switch')
  switchRoute(@Body() data: { from: string; to: string }) {
    return this.ndiService.routeSource(data.from, data.to);
  }

  @Patch('access-manager')
  updateAccess(@Body() config: Record<string, unknown>) {
    return this.ndiService.updateAccessControl(config);
  }

  // --- SRT ---

  @Get('srt')
  getSrtStreams() {
    return this.ndiService.getSrtStreams();
  }

  @Post('srt')
  createSrtStream(@Body() data: { name: string; url: string; mode: 'caller' | 'listener'; port: number }) {
    return this.ndiService.createSrtStream(data);
  }

  @Post('srt/:id/start')
  startSrtStream(@Param('id') id: string) {
    return this.ndiService.startSrtStream(id);
  }

  @Post('srt/:id/stop')
  stopSrtStream(@Param('id') id: string) {
    return this.ndiService.stopSrtStream(id);
  }

  @Delete('srt/:id')
  deleteSrtStream(@Param('id') id: string) {
    return this.ndiService.deleteSrtStream(id);
  }

  @Post('command')
  handleNdiCommand(@Body() dto: NdiActionDto) {
    switch (dto.type) {
      case NdiToolsType.TEST_PATTERNS:
        return this.ndiService.setTestPattern(dto.action);
      case NdiToolsType.STUDIO_MONITOR:
        return this.ndiService.controlMonitor(dto.action);
      case NdiToolsType.WEBCAM_INPUT:
        return this.ndiService.toggleWebcamInput(dto.action === 'enable');
      case NdiToolsType.SCREEN_CAPTURE:
        return this.ndiService.startScreenCapture(
          dto.payload?.region as string | undefined,
        );
      case NdiToolsType.BRIDGE:
        return this.ndiService.configureBridge(dto.payload ?? {});
      default:
        return { message: 'Action queued' };
    }
  }
}
