import type { CampaignStatus } from './campaigns';
import type { PersonChannel, PersonStatus } from './persons';
import type { EnrollmentStatus, EnrollmentStepStateStatus } from './enrollments';

export interface PortalProgress {
  totalSteps: number;
  completedSteps: number;
  percent: number;
}

export interface PortalRecipientSummary {
  id: string;
  displayName: string;
  timezone?: string | null;
}

export interface PortalCampaignSummary {
  id: string;
  enrollmentId: string;
  name: string;
  description?: string | null;
  status: EnrollmentStatus;
  campaignStatus: CampaignStatus;
  enrolledAt: string;
  completedAt?: string | null;
  progress: PortalProgress;
}

export interface PortalDashboard {
  recipient: PortalRecipientSummary | null;
  campaigns: PortalCampaignSummary[];
  deletionRequested: boolean;
}

export interface PortalCampaignStep {
  id: string;
  status: EnrollmentStepStateStatus;
  stepOrder: number;
  sentAt?: string | null;
  completedAt?: string | null;
  title: string;
  content: string;
  subject?: string | null;
  channelType?: PersonChannel['channelType'] | null;
}

export interface PortalCampaignDetail {
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  campaign: {
    id: string;
    name: string;
    description?: string | null;
    status: CampaignStatus;
  };
  progress: PortalProgress;
  steps: PortalCampaignStep[];
}

export interface PortalSettingsRecipient {
  id: string;
  displayName: string;
  status: PersonStatus;
  channels: Array<
    Pick<
      PersonChannel,
      'id' | 'channelType' | 'address' | 'verificationStatus' | 'enabled' | 'unsubscribed' | 'suppressed'
    >
  >;
}

export interface PortalSettings {
  deletionRequested: boolean;
  recipients: PortalSettingsRecipient[];
}
