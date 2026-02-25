import { Module } from '@nestjs/common';
import { IntercomService } from '@/intercom/intercom.service';
import { IntercomController } from '@/intercom/intercom.controller';

@Module({
  providers: [IntercomService],
  controllers: [IntercomController],
  exports: [IntercomService],
})
export class IntercomModule {}
