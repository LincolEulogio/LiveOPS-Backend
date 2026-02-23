export type SignalType = 'offer' | 'answer' | 'pranswer' | 'rollback';

export interface WebRTCSignal {
    type: SignalType;
    sdp?: string;
    candidate?: any; // Ideally we would define RTCIceCandidate here if we want to be purist
}

export interface WebRTCSignalPayload {
    productionId: string;
    targetUserId: string;
    signal: WebRTCSignal;
}

export interface WebRTCReceivedSignal {
    senderUserId: string;
    signal: WebRTCSignal;
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
