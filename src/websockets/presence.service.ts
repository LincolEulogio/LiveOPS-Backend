import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PresenceMember } from '@/common/types/webrtc.types';

export interface UserPresence extends PresenceMember {
  lastSeen: string;
  status: string;
}

const RECONNECT_GRACE_MS = 15_000;

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private server: Server | null = null;

  private activeSockets: Map<string, UserPresence> = new Map();
  private userToSockets: Map<string, Set<string>> = new Map();
  private productionToSockets: Map<string, Set<string>> = new Map();

  /**
   * Grace window for reconnecting users. If a user reconnects within
   * RECONNECT_GRACE_MS after disconnect, their presence is restored and
   * they are NOT marked OFFLINE.
   */
  private reconnecting: Map<
    string, // userId
    { timer: ReturnType<typeof setTimeout>; lastPresence: UserPresence; productionId?: string }
  > = new Map();

  setServer(server: Server): void {
    this.server = server;
  }

  broadcastToProduction(productionId: string): void {
    if (!this.server) return;
    const members = this.getPresenceForProduction(productionId);
    this.server.to(`production_${productionId}`).emit('presence.update', { members });
  }

  upsertPresence(clientId: string, data: UserPresence, productionId?: string) {
    // Cancel any pending reconnect timer for this user
    if (data.userId) {
      const pending = this.reconnecting.get(data.userId);
      if (pending) {
        clearTimeout(pending.timer);
        this.reconnecting.delete(data.userId);
        this.logger.log(`User ${data.userId} reconnected within grace period — presence restored`);
      }
    }

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

  /**
   * Starts a grace-period timer instead of immediately removing presence.
   * If the user reconnects within RECONNECT_GRACE_MS, the OFFLINE broadcast is skipped.
   */
  removePresence(clientId: string) {
    const data = this.activeSockets.get(clientId);
    if (data) {
      if (data.userId) {
        const sockets = this.userToSockets.get(data.userId);
        if (sockets) {
          sockets.delete(clientId);
          if (sockets.size === 0) {
            this.userToSockets.delete(data.userId);
            // Start grace period before broadcasting OFFLINE
            this.startReconnectGrace(data.userId, data, this.getProductionForSocket(clientId));
          }
        }
      }
      this.activeSockets.delete(clientId);
    }

    for (const [pid, sockets] of this.productionToSockets.entries()) {
      if (sockets.has(clientId)) {
        sockets.delete(clientId);
        if (sockets.size === 0) this.productionToSockets.delete(pid);
      }
    }
  }

  private startReconnectGrace(userId: string, lastPresence: UserPresence, productionId?: string) {
    // Clear any existing timer for this user
    const existing = this.reconnecting.get(userId);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.reconnecting.delete(userId);
      this.logger.warn(`User ${userId} grace period expired — broadcasting OFFLINE`);
      if (productionId) {
        this.broadcastToProduction(productionId);
      }
    }, RECONNECT_GRACE_MS);

    this.reconnecting.set(userId, { timer, lastPresence, productionId });
  }

  private getProductionForSocket(clientId: string): string | undefined {
    for (const [pid, sockets] of this.productionToSockets.entries()) {
      if (sockets.has(clientId)) return pid;
    }
    return undefined;
  }

  getSocketIdsForUser(userId: string): string[] {
    const sockets = this.userToSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  getPresenceForProduction(productionId: string): UserPresence[] {
    const socketIds = this.productionToSockets.get(productionId);
    const uniqueMembers = new Map<string, UserPresence>();

    if (socketIds) {
      for (const sid of socketIds) {
        const data = this.activeSockets.get(sid);
        if (data && data.userId) {
          uniqueMembers.set(data.userId, data);
        }
      }
    }

    // Also include users currently in grace period (show as RECONNECTING)
    for (const [userId, pending] of this.reconnecting.entries()) {
      if (pending.productionId === productionId && !uniqueMembers.has(userId)) {
        uniqueMembers.set(userId, { ...pending.lastPresence, status: 'RECONNECTING' });
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
