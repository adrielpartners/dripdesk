export type Channel = 'SMS' | 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type BillingStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INACTIVE';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export type ScheduleType = 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM';

export type CompletionMode = 'TIME_BASED' | 'LINK_CLICK' | 'REPLY';

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DROPPED';

export type StepStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'COMPLETED'
  | 'FAILED';

export type MessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface MessageJobData {
  enrollmentId: string;
  stepId: string;
  channels: string[];
}

export interface ScheduleJobData {
  organizationId: string;
}
