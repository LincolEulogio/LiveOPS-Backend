import { Injectable } from '@nestjs/common';
import OBSWebSocket from 'obs-websocket-js';
import { ObsInstance } from './obs-instance.types';

@Injectable()
export class ObsStateStore {
  private readonly connections = new Map<string, ObsInstance>();
  private readonly productionMap = new Map<string, Set<string>>();
  private readonly primaryMap = new Map<string, string>();

  set(connectionId: string, instance: ObsInstance): void {
    this.connections.set(connectionId, instance);
  }

  get(connectionId: string): ObsInstance | undefined {
    return this.connections.get(connectionId);
  }

  has(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  delete(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  entries(): IterableIterator<[string, ObsInstance]> {
    return this.connections.entries();
  }

  addToProduction(productionId: string, connectionId: string): void {
    if (!this.productionMap.has(productionId)) {
      this.productionMap.set(productionId, new Set());
    }
    this.productionMap.get(productionId)!.add(connectionId);
  }

  getProductionConnectionIds(productionId: string): Set<string> {
    return this.productionMap.get(productionId) ?? new Set();
  }

  removeProduction(productionId: string): void {
    this.productionMap.delete(productionId);
  }

  setPrimary(productionId: string, connectionId: string): void {
    this.primaryMap.set(productionId, connectionId);
  }

  getPrimary(productionId: string): string | undefined {
    return this.primaryMap.get(productionId);
  }

  removePrimary(productionId: string): void {
    this.primaryMap.delete(productionId);
  }

  getInstance(productionId: string): OBSWebSocket | undefined {
    const primaryId = this.primaryMap.get(productionId);
    if (primaryId) {
      const inst = this.connections.get(primaryId);
      if (inst?.isConnected) return inst.obs;
    }
    for (const connId of this.productionMap.get(productionId) ?? []) {
      const inst = this.connections.get(connId);
      if (inst?.isConnected) return inst.obs;
    }
    return undefined;
  }

  getObsState(productionId: string) {
    const primaryId = this.primaryMap.get(productionId);
    const instance = primaryId
      ? this.connections.get(primaryId)
      : [...(this.productionMap.get(productionId) ?? [])]
          .map((id) => this.connections.get(id))
          .find(Boolean);
    if (!instance) return { isConnected: false };
    return { isConnected: instance.isConnected, ...instance.lastState };
  }

  getConnectionState(connectionId: string) {
    const instance = this.connections.get(connectionId);
    if (!instance) return { isConnected: false };
    return { isConnected: instance.isConnected, ...instance.lastState };
  }

  listConnections(
    productionId: string,
  ): Array<{ connectionId: string; isConnected: boolean; url: string }> {
    const ids = this.productionMap.get(productionId) ?? new Set<string>();
    return [...ids].map((id) => {
      const inst = this.connections.get(id);
      return {
        connectionId: id,
        isConnected: inst?.isConnected ?? false,
        url: inst?.url ?? '',
      };
    });
  }
}
