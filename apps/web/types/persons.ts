export type PersonChannelType = 'sms' | 'telegram' | 'email';
export type PersonStatus = 'active' | 'archived' | 'deletion_requested';

export interface PersonChannel {
  id: string;
  organizationId: string;
  personId: string;
  channelType: PersonChannelType;
  address: string;
  verificationStatus: 'unverified' | 'verified';
  enabled: boolean;
  unsubscribed: boolean;
  suppressed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  organizationId: string;
  userId?: string | null;
  displayName: string;
  timezone?: string | null;
  status: PersonStatus;
  tags: string[];
  deletionRequestedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  channels: PersonChannel[];
}

export interface PaginatedPersons {
  data: Person[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

