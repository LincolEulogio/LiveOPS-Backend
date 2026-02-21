import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VmixConnectionManager } from './vmix-connection.manager';
import { VmixService } from './vmix.service';
import { VmixController } from './vmix.controller';

@Module({
  imports: [PrismaModule],
  providers: [VmixService, VmixConnectionManager],
  controllers: [VmixController],
  exports: [VmixService, VmixConnectionManager]
})
export class VmixModule { }
