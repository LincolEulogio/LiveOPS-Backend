import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
  private static storage = new AsyncLocalStorage<string>();

  static setTenantId(tenantId: string) {
    this.storage.enterWith(tenantId);
  }

  static getTenantId(): string | undefined {
    return this.storage.getStore();
  }

  static run<T>(tenantId: string, fn: () => T): T {
    return this.storage.run(tenantId, fn);
  }
}
