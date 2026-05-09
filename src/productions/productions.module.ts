import { Module } from '@nestjs/common';
import { ProductionsService } from '@/productions/productions.service';
import { ProductionsController } from '@/productions/productions.controller';
import { RehearsalService } from '@/productions/rehearsal.service';
import { ObsModule } from '@/obs/obs.module';
import { VmixModule } from '@/vmix/vmix.module';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [ObsModule, VmixModule, AuditModule],
  providers: [ProductionsService, RehearsalService],
  controllers: [ProductionsController],
})
export class ProductionsModule {}
