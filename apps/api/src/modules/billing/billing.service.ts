import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BILLING_PLAN_ACTIVE_CONTACT_LIMITS, BILLING_PLANS } from '@dripdesk/shared';
import { BillingStatus } from '@prisma/client';
import Stripe from 'stripe';
import { TenantContext } from '../../common/tenant/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';

type PlanId = (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS];

const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Free',
  core: 'Core',
  plus: 'Plus',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

@Injectable()
export class BillingService {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('dripdesk.stripeSecretKey', '');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  getPlans() {
    return Object.values(BILLING_PLANS).map((planId) => ({
      id: planId,
      name: PLAN_NAMES[planId],
      activeContactLimit: BILLING_PLAN_ACTIVE_CONTACT_LIMITS[planId],
      stripePriceId: this.priceIdFor(planId) || null,
      checkoutAvailable: Boolean(this.stripe && this.priceIdFor(planId)),
    }));
  }

  async getUsage(tenant: TenantContext) {
    const [subscription, activeContacts] = await Promise.all([
      this.findOrCreateSubscription(tenant.organizationId),
      this.countActiveContacts(tenant.organizationId),
    ]);

    const limit = subscription.activeContactLimit ?? this.limitForPlan(subscription.planId);

    return {
      plan: {
        id: subscription.planId,
        name: PLAN_NAMES[this.validPlanId(subscription.planId)],
        activeContactLimit: limit,
      },
      status: subscription.status,
      activeContacts,
      activeContactLimit: limit,
      remainingActiveContacts: limit === null ? null : Math.max(0, limit - activeContacts),
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      checkoutAvailable: Boolean(this.stripe),
    };
  }

  async createCheckoutSession(tenant: TenantContext, planId: string) {
    const plan = this.validPlanId(planId);
    if (plan === 'free' || plan === 'enterprise') {
      throw new BadRequestException('This plan does not use self-serve checkout');
    }

    const stripe = this.requireStripe();
    const priceId = this.priceIdFor(plan);
    if (!priceId) throw new ServiceUnavailableException('Stripe price is not configured for this plan');

    const [organization, subscription] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: tenant.organizationId } }),
      this.findOrCreateSubscription(tenant.organizationId),
    ]);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: subscription.stripeCustomerId ?? undefined,
      customer_email: subscription.stripeCustomerId ? undefined : undefined,
      client_reference_id: tenant.organizationId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.config.get<string>('dripdesk.publicWebUrl', 'http://localhost:3001')}/admin/billing?checkout=success`,
      cancel_url: `${this.config.get<string>('dripdesk.publicWebUrl', 'http://localhost:3001')}/admin/billing?checkout=cancelled`,
      metadata: {
        organizationId: tenant.organizationId,
        organizationName: organization.name,
        planId: plan,
      },
      subscription_data: {
        metadata: {
          organizationId: tenant.organizationId,
          planId: plan,
        },
      },
    });

    return { url: session.url };
  }

  async createCustomerPortalSession(tenant: TenantContext) {
    const stripe = this.requireStripe();
    const subscription = await this.findOrCreateSubscription(tenant.organizationId);
    if (!subscription.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer is connected to this organization');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.config.get<string>('dripdesk.publicWebUrl', 'http://localhost:3001')}/admin/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const stripe = this.requireStripe();
    const webhookSecret = this.config.get<string>('dripdesk.stripeWebhookSecret', '');
    if (!webhookSecret) throw new ServiceUnavailableException('Stripe webhook secret is not configured');
    if (!signature) throw new BadRequestException('Stripe signature is required');

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      await this.upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
    }

    if (event.type === 'customer.subscription.deleted') {
      await this.markSubscriptionCanceled(event.data.object as Stripe.Subscription);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const organizationId = session.client_reference_id ?? session.metadata?.organizationId;
    if (!organizationId) return;

    await this.prisma.billingSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId: this.validPlanId(session.metadata?.planId ?? 'free'),
        activeContactLimit: this.limitForPlan(session.metadata?.planId ?? 'free'),
        status: 'active',
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripeSubscriptionId:
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
      },
      update: {
        planId: this.validPlanId(session.metadata?.planId ?? 'free'),
        activeContactLimit: this.limitForPlan(session.metadata?.planId ?? 'free'),
        status: 'active',
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripeSubscriptionId:
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
      },
    });
  }

  private async upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    const planId = this.validPlanId(subscription.metadata?.planId ?? this.planIdForPrice(subscription.items.data[0]?.price.id));

    await this.prisma.billingSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId,
        status: this.mapStripeStatus(subscription.status),
        activeContactLimit: this.limitForPlan(planId),
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        planId,
        status: this.mapStripeStatus(subscription.status),
        activeContactLimit: this.limitForPlan(planId),
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async markSubscriptionCanceled(subscription: Stripe.Subscription) {
    await this.prisma.billingSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async findOrCreateSubscription(organizationId: string) {
    return this.prisma.billingSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId: 'free',
        status: 'inactive',
        activeContactLimit: BILLING_PLAN_ACTIVE_CONTACT_LIMITS.free,
      },
      update: {},
    });
  }

  private async countActiveContacts(organizationId: string) {
    const activeContacts = await this.prisma.enrollment.findMany({
      where: {
        organizationId,
        status: 'active',
        enrolledAt: { gte: this.activeContactWindowStart() },
      },
      distinct: ['personId'],
      select: { personId: true },
    });

    return activeContacts.length;
  }

  private requireStripe() {
    if (!this.stripe) throw new ServiceUnavailableException('Stripe is not configured');
    return this.stripe;
  }

  private validPlanId(planId: string | null | undefined): PlanId {
    const candidate = planId ?? 'free';
    if (Object.values(BILLING_PLANS).includes(candidate as PlanId)) return candidate as PlanId;
    return 'free';
  }

  private limitForPlan(planId: string | null | undefined) {
    return BILLING_PLAN_ACTIVE_CONTACT_LIMITS[this.validPlanId(planId)];
  }

  private priceIdFor(planId: PlanId) {
    if (planId === 'core') return this.config.get<string>('dripdesk.stripeCorePriceId', '');
    if (planId === 'plus') return this.config.get<string>('dripdesk.stripePlusPriceId', '');
    if (planId === 'pro') return this.config.get<string>('dripdesk.stripeProPriceId', '');
    return '';
  }

  private planIdForPrice(priceId: string | undefined) {
    if (!priceId) return 'free';
    if (priceId === this.priceIdFor('core')) return 'core';
    if (priceId === this.priceIdFor('plus')) return 'plus';
    if (priceId === this.priceIdFor('pro')) return 'pro';
    return 'free';
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): BillingStatus {
    if (status === 'active' || status === 'trialing') return status === 'trialing' ? 'trial' : 'active';
    if (status === 'past_due' || status === 'unpaid') return 'past_due';
    if (status === 'canceled') return 'canceled';
    return 'inactive';
  }

  private activeContactWindowStart() {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
}
