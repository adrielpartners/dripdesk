export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type CampaignScheduleType =
  | 'daily'
  | 'weekdays'
  | 'monday_wednesday_friday'
  | 'custom_interval'
  | 'custom_days_of_week';
export type CampaignProgressRule = 'time_based' | 'link_click_required' | 'reply_required';
export type CampaignMode = 'standard' | 'advanced';
export type CampaignChannel = 'sms' | 'telegram' | 'email';
export type CampaignStepStatus = 'draft' | 'published' | 'archived';

export interface CampaignScheduleConfig {
  sendTime?: string;
  intervalDays?: number;
  daysOfWeek?: number[];
}

export interface CampaignStep {
  id: string;
  campaignId: string;
  stepOrder: number;
  title: string;
  status: CampaignStepStatus;
  defaultContent?: string | null;
  smsContent?: string | null;
  telegramContent?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  delayDaysOverride?: number | null;
  channelOverrides: CampaignChannel[];
  replyRequiredPhrases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  scheduleType: CampaignScheduleType;
  scheduleConfig?: CampaignScheduleConfig | null;
  progressRule: CampaignProgressRule;
  mode: CampaignMode;
  defaultChannels: CampaignChannel[];
  createdAt: string;
  updatedAt: string;
  activatedAt?: string | null;
  archivedAt?: string | null;
  steps?: CampaignStep[];
  _count?: {
    steps: number;
  };
}

export interface PaginatedCampaigns {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
