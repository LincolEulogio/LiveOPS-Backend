import { Module } from '@nestjs/common';
import { ProductionsService } from './productions.service';
import { ProductionsController } from './productions.controller';
import { RehearsalService } from './rehearsal.service';

@Module({
  providers: [ProductionsService, RehearsalService],
  controllers: [ProductionsController],
})
export class ProductionsModule { }
