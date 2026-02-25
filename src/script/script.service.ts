import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as Y from 'yjs';

@Injectable()
export class ScriptService {
  constructor(private prisma: PrismaService) { }

  async getScriptState(productionId: string) {
    return this.prisma.productionScript.findUnique({
      where: { productionId },
    });
  }

  async updateScriptState(productionId: string, update: Buffer) {
    const existing = await this.prisma.productionScript.findUnique({
      where: { productionId },
    });

    const doc = new Y.Doc();
    if (existing?.content) {
      Y.applyUpdate(doc, new Uint8Array(existing.content));
    }

    Y.applyUpdate(doc, new Uint8Array(update));
    const mergedContent = Y.encodeStateAsUpdate(doc);

    return this.prisma.productionScript.upsert({
      where: { productionId },
      update: { content: Buffer.from(mergedContent) },
      create: {
        productionId,
        content: Buffer.from(mergedContent),
      },
    });
  }
}
