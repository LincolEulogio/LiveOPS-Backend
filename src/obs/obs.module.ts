import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { ObsConnectionManager } from '@/obs/obs-connection.manager';
import { ObsService } from '@/obs/obs.service';
import { ObsController } from '@/obs/obs.controller';
import { FieldCipherService } from '@/common/crypto/field-cipher.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [ObsService, ObsConnectionManager, FieldCipherService],
  controllers: [ObsController],
  exports: [ObsService, ObsConnectionManager],
})
export class ObsModule {}
