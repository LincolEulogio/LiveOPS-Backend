import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    tenantId?: string;
    productionId?: string;
    isNdiBridge?: boolean;
    bridgeName?: string;
    [key: string]: unknown;
  };
}

export interface SocialCommentPayload {
  id: string;
  author: string;
  content: string;
  platform: string;
  avatarUrl?: string;
  timestamp: string;
}

export interface IntercomCommandPayload {
  id: string;
  productionId: string;
  senderId: string;
  targetUserId?: string;
  targetRoleId?: string;
  templateId?: string;
  message: string;
  requiresAck?: boolean;
  createdAt: string;
  status?: string;
  sender?: { id: string; name: string };
}

export interface NdiSource {
  name: string;
  ipAddress?: string;
  port?: number;
  status: string;
}
