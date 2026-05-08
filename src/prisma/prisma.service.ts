import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { TenantContext } from '../common/utils/tenant-context';

const TENANT_MODELS = [
  'Production',
  'User',
  'MediaAsset',
  'ChatMessage',
  'OverlayTemplate',
];

type FilterArgs = { where?: Record<string, unknown> };
type MutationArgs = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

function buildTenantExtension(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = TenantContext.getTenantId();

          if (tenantId && TENANT_MODELS.includes(model)) {
            if (
              ['findMany', 'findFirst', 'findUnique', 'count'].includes(
                operation,
              )
            ) {
              const typedArgs = args as FilterArgs;
              typedArgs.where = { ...typedArgs.where, tenantId };
            } else if (['create', 'createMany'].includes(operation)) {
              const typedArgs = args as MutationArgs;
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data = typedArgs.data.map((item) => ({
                  ...item,
                  tenantId,
                }));
              } else {
                typedArgs.data = { ...typedArgs.data, tenantId };
              }
            }
          }
          return query(args);
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof buildTenantExtension>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private extendedClient: ExtendedPrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.extendedClient = buildTenantExtension(this);
  }

  get client(): ExtendedPrismaClient {
    return this.extendedClient;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
