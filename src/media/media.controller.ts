import { Controller, Get, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MediaController {
    constructor(private mediaService: MediaService) { }

    @Get('assets')
    @Permissions('media:view')
    async getAssets() {
        return this.mediaService.getAssets();
    }
}
