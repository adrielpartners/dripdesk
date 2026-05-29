export type Channel = 'sms' | 'telegram' | 'email';

export type UserRole = 'owner' | 'admin' | 'recipient';

export type BillingStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'inactive';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type ScheduleType = 'daily' | 'weekdays' | 'weekly' | 'custom';

export type CompletionMode = 'time_based' | 'link_click_required' | 'reply_required';

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'removed';

export type StepStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'completed'
  | 'failed';

export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export interface ApiResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export interface MessageJobData {
  enrollmentId: string;
  stepId: string;
  channels: string[];
}

export interface TenantJobData {
  organizationId?: string;
}

export interface TestJobData {
  requestedBy: string;
  organizationId: string;
  requestedAt: string;
}

export interface ScheduleDueStepsJobData {
  scheduledAt: string;
}

export interface SendMessageJobData {
  enrollmentId: string;
  campaignStepId: string;
  channel: Channel;
}

export interface ProcessProviderEventJobData {
  provider: string;
  eventId: string;
}

export interface EvaluateProgressJobData {
  enrollmentId: string;
}

export interface CleanupExpiredTokensJobData {
  requestedAt: string;
}

export interface ScheduleJobData extends TenantJobData {
  organizationId: string;
}
