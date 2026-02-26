/**
 * Socket Event Names
 * SSOT (Single Source of Truth) for all socket communication
 */
export enum SocketEvents {
    // Presence & Connection
    PRODUCTION_JOIN = 'production.join',
    PRODUCTION_LEAVE = 'production.leave',
    PRESENCE_UPDATE = 'presence.update',
    PRESENCE_REQUEST = 'presence.request',

    // WebRTC Signaling
    WEBRTC_SIGNAL = 'webrtc.signal',
    WEBRTC_SIGNAL_RECEIVED = 'webrtc.signal_received',
    WEBRTC_TALKING = 'webrtc.talking',
    WEBRTC_TALKING_RECEIVED = 'webrtc.talking',
    WEBRTC_AUDIO_LEVEL = 'webrtc.audio_level',
    WEBRTC_AUDIO_LEVEL_RECEIVED = 'webrtc.audio_level',

    // Timeline/Escaleta
    TIMELINE_UPDATED = 'timeline.updated',
    TIME_SYNC = 'time.sync',

    // Engine States (OBS/vMix)
    VMIX_INPUT_CHANGED = 'vmix.input.changed',
    VMIX_CONNECTION_STATE = 'vmix.connection.state',
    OBS_SCENE_CHANGED = 'obs.scene.changed',
    OBS_STREAM_STATE = 'obs.stream.state',
    OBS_RECORD_STATE = 'obs.record.state',
    OBS_CONNECTION_STATE = 'obs.connection.state',

    // Production Health
    PRODUCTION_HEALTH_STATS = 'production.health.stats',

    // Intercom / Commands
    COMMAND_SEND = 'command.send',
    COMMAND_RECEIVED = 'command.received',
    COMMAND_ACK = 'command.ack',
    COMMAND_ACK_RECEIVED = 'command.ack_received',

    // Chat
    CHAT_SEND = 'chat.send',
    CHAT_RECEIVED = 'chat.received',
    CHAT_TYPING = 'chat.typing',
    CHAT_DIRECT = 'chat.direct',

    // Script/Editor
    SCRIPT_SYNC = 'script.sync',
    SCRIPT_SYNC_RESPONSE = 'script.sync_response',
    SCRIPT_UPDATE = 'script.update',
    SCRIPT_UPDATE_RECEIVED = 'script.update_received',
    SCRIPT_AWARENESS_UPDATE = 'script.awareness_update',
    SCRIPT_AWARENESS_RECEIVED = 'script.awareness_received',
    SCRIPT_SCROLL_SYNC = 'script.scroll_sync',
    SCRIPT_SCROLL_RECEIVED = 'script.scroll_received',
}
