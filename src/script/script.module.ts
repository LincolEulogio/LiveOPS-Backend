import { Module } from '@nestjs/common';
import { ScriptService } from './script.service';
import { HocuspocusService } from './hocuspocus.service';

@Module({
  providers: [ScriptService, HocuspocusService],
  exports: [ScriptService, HocuspocusService],
})
export class ScriptModule {}
