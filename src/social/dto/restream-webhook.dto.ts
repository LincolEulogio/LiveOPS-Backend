export interface RestreamChannel {
  id: string;
  platform: string;
  displayName: string;
}

export interface RestreamAuthor {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

export interface RestreamChatMessagePayload {
  channel: RestreamChannel;
  author: RestreamAuthor;
  text: string;
  id: string;
  timestamp: number;
}

export interface RestreamWebhookDto {
  type: string;
  payload: RestreamChatMessagePayload;
}
