import { Module } from '@nestjs/common';
import { IntercomService } from './intercom.service';
import { IntercomController } from './intercom.controller';

@Module({
  providers: [IntercomService],
  controllers: [IntercomController]
})
export class IntercomModule {}
