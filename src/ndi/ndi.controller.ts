import { Controller, Get, Post, Body, UseGuards, Patch } from '@nestjs/common';
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
