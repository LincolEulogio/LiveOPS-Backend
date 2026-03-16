import { Module } from '@nestjs/common';
import { NdiController } from './ndi.controller';
import { NdiService } from './ndi.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [NdiController],
    providers: [NdiService],
    exports: [NdiService],
})
export class NdiModule { }
