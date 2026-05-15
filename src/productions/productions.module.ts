import { Module } from '@nestjs/common';
import { ObsModule } from '@/obs/obs.module';
import { VmixModule } from '@/vmix/vmix.module';
import { AuditModule } from '@/audit/audit.module';
import { ProductionsService } from './productions.service';
import { ProductionsStateService } from './productions-state.service';
import { ProductionsMembersService } from './productions-members.service';
import { ProductionsTemplatesService } from './productions-templates.service';
import { ProductionsController } from './productions.controller';
import { RehearsalService } from './rehearsal.service';

const PRODUCTIONS_PROVIDERS = [
  ProductionsService,
  ProductionsStateService,
  ProductionsMembersService,
  ProductionsTemplatesService,
  RehearsalService,
];

@Module({
  imports: [ObsModule, VmixModule, AuditModule],
  providers: PRODUCTIONS_PROVIDERS,
  controllers: [ProductionsController],
  exports: [ProductionsService],
})
export class ProductionsModule {}
