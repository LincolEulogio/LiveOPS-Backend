import { Module } from '@nestjs/common';
import { OverlaysService } from './overlays.service';
import { OverlaysController } from './overlays.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OverlaysController],
    providers: [OverlaysService],
    exports: [OverlaysService],
})
export class OverlaysModule { }
