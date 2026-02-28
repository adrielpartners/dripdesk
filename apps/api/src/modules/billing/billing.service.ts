import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', ''), { apiVersion: '2024-12-18.acacia' });
  }

  async getPlans() {
    return this.prisma.billingPlan.findMany({ orderBy: { price: 'asc' } });
  }

  async createSubscription(orgId: string, planId: string, paymentMethodId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const plan = await this.prisma.billingPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.stripePriceId) throw new NotFoundException('Plan not found');

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({ metadata: { organizationId: orgId } });
      customerId = customer.id;
    }

    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.stripePriceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, billingPlanId: planId, billingStatus: 'ACTIVE' },
    });

    return { subscriptionId: subscription.id, status: subscription.status };
  }

  async getUsage(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { billingPlan: true },
    });

    const [activeContacts, campaigns] = await Promise.all([
      this.prisma.person.count({ where: { organizationId: orgId, deletedAt: null, globallyUnsubscribed: false } }),
      this.prisma.campaign.count({ where: { organizationId: orgId, deletedAt: null } }),
    ]);

    return {
      billingStatus: org?.billingStatus,
      billingPlan: org?.billingPlan,
      trialEndsAt: org?.trialEndsAt,
      usage: { activeContacts, campaigns },
      limits: {
        activeContacts: org?.billingPlan?.activeContactsLimit ?? 10,
        campaigns: org?.billingPlan?.campaignsLimit,
      },
    };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.prisma.organization.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            billingStatus: sub.status === 'active' ? 'ACTIVE' : sub.status === 'past_due' ? 'PAST_DUE' : 'CANCELED',
          },
        });
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.prisma.billingHistory.create({
          data: {
            organizationId: (await this.prisma.organization.findFirst({ where: { stripeCustomerId: invoice.customer as string } }))?.id ?? '',
            stripeInvoiceId: invoice.id,
            amount: (invoice.amount_paid / 100).toString(),
            currency: invoice.currency.toUpperCase(),
            status: 'PAID',
            paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
          },
        });
        break;
      }
    }

    return { received: true };
  }
}
