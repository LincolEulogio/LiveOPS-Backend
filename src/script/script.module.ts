import { Module } from '@nestjs/common';
import { ScriptService } from '@/script/script.service';

@Module({
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
