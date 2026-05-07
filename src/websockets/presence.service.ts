import { Injectable, Logger } from '@nestjs/common';
import { PresenceMember } from '@/common/types/webrtc.types';

export interface UserPresence extends PresenceMember {
  lastSeen: string;
  status: string;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  // clientId (socketId) -> Presence data
  private activeSockets: Map<string, UserPresence> = new Map();
  // userId -> Set of clientIds (socketIds)
  // A user can be connected from multiple devices/tabs
  private userToSockets: Map<string, Set<string>> = new Map();
  // productionId -> Set of clientIds (socketIds)
  private productionToSockets: Map<string, Set<string>> = new Map();

  upsertPresence(clientId: string, data: UserPresence, productionId?: string) {
    this.activeSockets.set(clientId, {
      ...data,
      lastSeen: new Date().toISOString(),
    });

    if (data.userId) {
      if (!this.userToSockets.has(data.userId)) {
        this.userToSockets.set(data.userId, new Set());
      }
      this.userToSockets.get(data.userId)!.add(clientId);
    }

    if (productionId) {
      this.associateWithProduction(clientId, productionId);
    }
  }

  associateWithProduction(clientId: string, productionId: string) {
    if (!this.productionToSockets.has(productionId)) {
      this.productionToSockets.set(productionId, new Set());
    }
    this.productionToSockets.get(productionId)!.add(clientId);
  }

  removePresence(clientId: string) {
    const data = this.activeSockets.get(clientId);
    if (data) {
      if (data.userId) {
        const sockets = this.userToSockets.get(data.userId);
        if (sockets) {
          sockets.delete(clientId);
          if (sockets.size === 0) this.userToSockets.delete(data.userId);
        }
      }
      this.activeSockets.delete(clientId);
    }

    // Also remove from production sets (cleanup)
    for (const [pid, sockets] of this.productionToSockets.entries()) {
      if (sockets.has(clientId)) {
        sockets.delete(clientId);
        if (sockets.size === 0) this.productionToSockets.delete(pid);
      }
    }
  }

  getSocketIdsForUser(userId: string): string[] {
    const sockets = this.userToSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  getPresenceForProduction(productionId: string): UserPresence[] {
    const socketIds = this.productionToSockets.get(productionId);
    if (!socketIds) return [];

    const uniqueMembers = new Map<string, UserPresence>();
    for (const sid of socketIds) {
      const data = this.activeSockets.get(sid);
      if (data && data.userId) {
        uniqueMembers.set(data.userId, data);
      }
    }
    return Array.from(uniqueMembers.values());
  }

  getInactiveSockets(timeoutMs: number): string[] {
    const now = Date.now();
    const inactive: string[] = [];
    for (const [sid, data] of this.activeSockets.entries()) {
      const lastSeen = new Date(data.lastSeen).getTime();
      if (now - lastSeen > timeoutMs && data.status !== 'OFFLINE') {
        inactive.push(sid);
      }
    }
    return inactive;
  }

  updateStatus(clientId: string, status: string) {
    const data = this.activeSockets.get(clientId);
    if (data) {
      data.status = status;
      data.lastSeen = new Date().toISOString();
    }
  }

  heartbeat(clientId: string) {
    const data = this.activeSockets.get(clientId);
    if (data) {
      data.lastSeen = new Date().toISOString();
      if (data.status === 'OFFLINE') data.status = 'IDLE';
    }
  }

  getProductionsWithActiveUsers(): string[] {
    return Array.from(this.productionToSockets.keys());
  }
}
