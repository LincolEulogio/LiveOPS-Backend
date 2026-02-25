import { Module } from '@nestjs/common';
import { ProductionsService } from '@/productions/productions.service';
import { ProductionsController } from '@/productions/productions.controller';
import { RehearsalService } from '@/productions/rehearsal.service';

@Module({
  providers: [ProductionsService, RehearsalService],
  controllers: [ProductionsController],
})
export class ProductionsModule { }
