import { Module } from '@nestjs/common';
import { OverlaysService } from '@/overlays/overlays.service';
import { OverlaysController } from '@/overlays/overlays.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OverlaysController],
    providers: [OverlaysService],
    exports: [OverlaysService],
})
export class OverlaysModule { }
