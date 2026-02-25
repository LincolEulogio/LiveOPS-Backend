import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { TimelineService } from '@/timeline/timeline.service';
import { TimelineController } from '@/timeline/timeline.controller';

@Module({
  imports: [PrismaModule],
  providers: [TimelineService],
  controllers: [TimelineController],
})
export class TimelineModule {}
