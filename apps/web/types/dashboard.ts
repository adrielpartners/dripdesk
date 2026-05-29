import type { CampaignStatus } from './campaigns';

export interface DashboardMetrics {
  activeContacts: number;
  averageOpenRate: number;
  averageClickRate: number;
  averageCompletionRate: number;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  status: CampaignStatus;
  activeEnrolledCount: number;
  openRate: number;
  clickRate: number;
  completionRate: number;
  lastSentAt: string | null;
}

export interface DashboardMeta {
  activeContactWindowDays: number;
  campaignPerformanceLimit: number;
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  campaignCount: number;
  campaignPerformance: CampaignPerformance[];
  meta: DashboardMeta;
}
