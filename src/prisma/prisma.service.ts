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

/**
 * Models that use soft-delete (deletedAt field).
 * Hard-deletes on these are blocked at the ORM level to prevent accidental cascade data loss.
 */
const SOFT_DELETE_MODELS = ['Production'];

function buildTenantExtension(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Guard: block hard-deletes on soft-delete models
          if (SOFT_DELETE_MODELS.includes(model) && operation === 'delete') {
            throw new Error(
              `Hard delete on "${model}" is blocked. Use soft-delete (set deletedAt) to preserve related data and audit trail.`,
            );
          }
          if (SOFT_DELETE_MODELS.includes(model) && operation === 'deleteMany') {
            throw new Error(
              `Hard deleteMany on "${model}" is blocked. Use bulk soft-delete instead.`,
            );
          }

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
