import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Server, onConnectPayload } from '@hocuspocus/server';
import { PrismaService } from '@/prisma/prisma.service';
import * as Y from 'yjs';

@Injectable()
export class HocuspocusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HocuspocusService.name);
  private server: Server;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.server = new Server({
      port: 1234,
      onLoadDocument: async (data) => {
        const { documentName } = data;
        const productionId = documentName;
        const script = await this.prisma.productionScript.findUnique({
          where: { productionId },
        });

        const doc = new Y.Doc();
        if (script?.content) {
          Y.applyUpdate(doc, new Uint8Array(script.content));
        }
        return doc;
      },

      onStoreDocument: async (data) => {
        const { documentName, document } = data;
        const productionId = documentName;
        const update = Y.encodeStateAsUpdate(document);

        await this.prisma.productionScript.upsert({
          where: { productionId },
          update: { content: Buffer.from(update) },
          create: {
            productionId,
            content: Buffer.from(update),
          },
        });
      },
      onConnect: (data: onConnectPayload): Promise<void> => {
        this.logger.debug(
          `New collaboration link established: ${data.requestHeaders.get('x-production-id')}`,
        );
        return Promise.resolve();
      },
    });

    await this.server.listen();
    this.logger.log('Hocuspocus Collaboration Server active on port 1234');
  }

  async onModuleDestroy() {
    await this.server?.destroy();
  }
}
