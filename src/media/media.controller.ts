import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { MediaService } from '@/media/media.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { IsNotEmpty, IsNumber, IsString, IsEnum } from 'class-validator';
import { AssetType } from '@prisma/client';

class SaveAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsEnum(AssetType)
  type: AssetType;

  @IsNumber()
  size: number;

  @IsString()
  mimeType: string;
}

@Controller('media')
@Protected()
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Get('assets/:productionId')
  @Permissions('media:view')
  async getAssets(@Param('productionId') productionId: string) {
    return this.mediaService.getAssets(productionId);
  }

  @Post('assets/:productionId')
  @Permissions('media:view')
  async saveAsset(
    @Param('productionId') productionId: string,
    @Body() body: SaveAssetDto,
  ) {
    return this.mediaService.saveAsset({ ...body, productionId });
  }

  @Delete('assets/:productionId/:id')
  @Permissions('media:view')
  async deleteAsset(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.mediaService.deleteAsset(id, productionId);
  }
}

