import { Organization } from '@prisma/client';

export interface ChannelSendData {
  organization: Organization;
  recipient: string;
  content: string;
  subject?: string;
  mediaUrl?: string;
  parseMode?: string;
}

export interface ChannelResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface MessageChannel {
  type: string;
  send(data: ChannelSendData): Promise<ChannelResult>;
}
