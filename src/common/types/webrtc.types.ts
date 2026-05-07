export type SignalType = 'offer' | 'answer' | 'pranswer' | 'rollback';

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface WebRTCSignal {
  type: SignalType;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

export interface WebRTCSignalPayload {
  productionId: string;
  targetUserId: string;
  signal: WebRTCSignal;
  context?: 'intercom' | 'videocall';
}

export interface WebRTCReceivedSignal {
  senderUserId: string;
  signal: WebRTCSignal;
  context?: 'intercom' | 'videocall';
}

export interface PresenceMember {
  userId: string;
  userName: string;
  roleId: string;
  roleName: string;
  lastSeen: string;
  status: string;
}

export interface PresenceUpdatePayload {
  members: PresenceMember[];
}
