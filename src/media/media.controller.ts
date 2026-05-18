import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Protected } from '@/common/decorators/protected.decorator';
import { MediaService } from '@/media/media.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { IsNotEmpty, IsNumber, IsString, IsEnum, IsPositive } from 'class-validator';
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

class InitiateUploadDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @IsPositive()
  totalSize: number;
}

class UpdateProgressDto {
  @IsNumber()
  @IsPositive()
  uploadedBytes: number;
}

class CompleteUploadDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsEnum(AssetType)
  type: AssetType;
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
  @Permissions('media:delete')
  async deleteAsset(
    @Param('productionId') productionId: string,
    @Param('id') id: string,
  ) {
    return this.mediaService.deleteAsset(id, productionId);
  }

  // ─── Chunked / resumable upload ───────────────────────────────────────────

  @Post('upload/:productionId/initiate')
  @Permissions('media:upload')
  @HttpCode(HttpStatus.CREATED)
  initiateUpload(
    @Param('productionId') productionId: string,
    @Body() dto: InitiateUploadDto,
  ) {
    return this.mediaService.initiateUpload({ productionId, ...dto });
  }

  @Get('upload/session/:sessionId')
  @Permissions('media:upload')
  getUploadSession(@Param('sessionId') sessionId: string) {
    const session = this.mediaService.getUploadSession(sessionId);
    if (!session) throw new NotFoundException('Upload session not found');
    return session;
  }

  @Patch('upload/session/:sessionId/progress')
  @Permissions('media:upload')
  updateProgress(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.mediaService.updateUploadProgress(sessionId, dto.uploadedBytes);
  }

  @Post('upload/session/:sessionId/complete')
  @Permissions('media:upload')
  @HttpCode(HttpStatus.CREATED)
  completeUpload(
    @Param('sessionId') sessionId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.mediaService.completeUpload(sessionId, dto.fileUrl, dto.type);
  }
}

