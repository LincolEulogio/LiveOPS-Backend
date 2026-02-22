import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScriptService {
  constructor(private prisma: PrismaService) {}

  async getScriptState(productionId: string) {
    return this.prisma.productionScript.findUnique({
      where: { productionId },
    });
  }

  async updateScriptState(productionId: string, content: Buffer) {
    return this.prisma.productionScript.upsert({
      where: { productionId },
      update: { content: content as any },
      create: {
        productionId,
        content: content as any,
      },
    });
  }
}
