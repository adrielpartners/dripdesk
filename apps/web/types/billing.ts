export type BillingPlanId = 'free' | 'core' | 'plus' | 'pro' | 'enterprise';
export type BillingStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'inactive';

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  activeContactLimit: number | null;
  stripePriceId: string | null;
  checkoutAvailable: boolean;
}

export interface BillingUsage {
  plan: {
    id: BillingPlanId;
    name: string;
    activeContactLimit: number | null;
  };
  status: BillingStatus;
  activeContacts: number;
  activeContactLimit: number | null;
  remainingActiveContacts: number | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  checkoutAvailable: boolean;
}
