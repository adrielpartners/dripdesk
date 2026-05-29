import type { Campaign } from './campaigns';
import type { Person } from './persons';

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'removed';
export type EnrollmentStepStateStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'clicked'
  | 'replied'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'unsubscribed';

export interface EnrollmentStepState {
  id: string;
  enrollmentId: string;
  campaignStepId: string;
  stepOrder: number;
  status: EnrollmentStepStateStatus;
  campaignStep: {
    id: string;
    title: string;
    stepOrder: number;
  };
}

export interface Enrollment {
  id: string;
  organizationId: string;
  campaignId: string;
  personId: string;
  status: EnrollmentStatus;
  currentStepOrder: number;
  enrolledAt: string;
  pausedAt?: string | null;
  removedAt?: string | null;
  completedAt?: string | null;
  person: Pick<Person, 'id' | 'displayName' | 'status'>;
  campaign: Pick<Campaign, 'id' | 'name' | 'status'>;
  stepStates: EnrollmentStepState[];
}

export interface PaginatedEnrollments {
  data: Enrollment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActiveContactUsage {
  plan: 'free';
  activeContacts: number;
  activeContactLimit: number;
  remainingActiveContacts: number;
  activeContactWindowDays: number;
}
