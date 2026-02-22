import { Controller, Get } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
    constructor(private mediaService: MediaService) { }

    @Get('assets')
    async getAssets() {
        return this.mediaService.getAssets();
    }
}
