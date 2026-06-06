import assert from 'assert';
import { BillingService } from './billing.service';

// Minimal mock config — no Stripe keys, free-tier only
const mockConfig = {
  get: (key: string, fallback?: string) => {
    if (key === 'dripdesk.stripeSecretKey') return '';
    if (key === 'dripdesk.stripeCorePriceId') return '';
    if (key === 'dripdesk.stripePlusPriceId') return '';
    if (key === 'dripdesk.stripeProPriceId') return '';
    return fallback ?? '';
  },
} as any;

const service = new BillingService({} as any, mockConfig);

// --- getPlans ---
const plans = service.getPlans();
assert(Array.isArray(plans), 'getPlans returns an array');

const freePlan = plans.find((p) => p.id === 'free');
assert(freePlan, 'free plan exists');
assert.strictEqual(freePlan.name, 'Free');
assert.strictEqual(freePlan.activeContactLimit, 10);
assert.strictEqual(freePlan.checkoutAvailable, false);

const corePlan = plans.find((p) => p.id === 'core');
assert(corePlan, 'core plan exists');
assert.strictEqual(corePlan.name, 'Core');
assert.strictEqual(corePlan.activeContactLimit, 250);
assert.strictEqual(corePlan.checkoutAvailable, false);

const plusPlan = plans.find((p) => p.id === 'plus');
assert(plusPlan, 'plus plan exists');
assert.strictEqual(plusPlan.activeContactLimit, 1000);

const proPlan = plans.find((p) => p.id === 'pro');
assert(proPlan, 'pro plan exists');
assert.strictEqual(proPlan.activeContactLimit, 5000);

const enterprisePlan = plans.find((p) => p.id === 'enterprise');
assert(enterprisePlan, 'enterprise plan exists');
assert.strictEqual(enterprisePlan.activeContactLimit, null);

console.log('billing service tests passed');