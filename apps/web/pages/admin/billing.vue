<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Admin</p>
      <h1 class="page-header__title">Billing</h1>
      <p class="page-header__description">Manage active-contact limits and Stripe subscription status.</p>
    </header>

    <AppEmptyState v-if="error" title="Could not load billing" :description="error" />

    <template v-else>
      <div class="dashboard-grid">
        <AppMetricCard label="Plan" :value="pending ? '-' : usage?.plan.name ?? 'Free'" />
        <AppMetricCard label="Status" :value="pending ? '-' : usage?.status ?? '-'" />
        <AppMetricCard label="Active contacts" :value="pending ? '-' : activeContactLabel" />
      </div>

      <AppCard title="Plans">
        <AppTable label="Billing plans">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Active contacts</th>
              <th>Checkout</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="4">Loading billing...</td>
            </tr>
            <tr v-for="plan in plans" v-else :key="plan.id">
              <td>{{ plan.name }}</td>
              <td>{{ formatLimit(plan.activeContactLimit) }}</td>
              <td>
                <AppBadge :tone="plan.checkoutAvailable ? 'success' : 'neutral'">
                  {{ plan.checkoutAvailable ? 'available' : 'not configured' }}
                </AppBadge>
              </td>
              <td>
                <AppButton
                  v-if="plan.id !== 'free' && plan.id !== 'enterprise'"
                  size="sm"
                  variant="ghost"
                  :disabled="!plan.checkoutAvailable || actionPending"
                  @click="checkout(plan.id)"
                >
                  Choose
                </AppButton>
              </td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>

      <AppCard title="Stripe">
        <p class="billing-copy">
          Stripe status is updated by verified webhooks. Subscription status cannot be changed from the browser.
        </p>
        <AppButton variant="secondary" :disabled="!usage?.stripeCustomerId || actionPending" @click="openPortal">
          Manage in Stripe
        </AppButton>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '~/services/api-client';
import type { BillingPlan, BillingPlanId, BillingUsage } from '~/types/billing';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const plans = ref<BillingPlan[]>([]);
const usage = ref<BillingUsage | null>(null);
const pending = ref(false);
const actionPending = ref(false);
const error = ref<string | null>(null);

const activeContactLabel = computed(() => {
  if (!usage.value) return '-';
  return `${usage.value.activeContacts} / ${formatLimit(usage.value.activeContactLimit)}`;
});

onMounted(() => {
  void loadBilling();
});

async function loadBilling() {
  pending.value = true;
  error.value = null;

  try {
    const [plansResponse, usageResponse] = await Promise.all([
      apiRequest<BillingPlan[]>('/billing/plans'),
      apiRequest<BillingUsage>('/billing/usage'),
    ]);
    plans.value = plansResponse;
    usage.value = usageResponse;
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Billing could not be loaded';
  } finally {
    pending.value = false;
  }
}

async function checkout(planId: BillingPlanId) {
  actionPending.value = true;
  error.value = null;

  try {
    const response = await apiRequest<{ url: string | null }>('/billing/checkout', {
      method: 'POST',
      body: { planId },
    });
    if (response.url) window.location.href = response.url;
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Checkout could not be started';
  } finally {
    actionPending.value = false;
  }
}

async function openPortal() {
  actionPending.value = true;
  error.value = null;

  try {
    const response = await apiRequest<{ url: string | null }>('/billing/portal', { method: 'POST' });
    if (response.url) window.location.href = response.url;
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Stripe portal could not be opened';
  } finally {
    actionPending.value = false;
  }
}

function formatLimit(limit: number | null) {
  return limit === null ? 'Custom' : new Intl.NumberFormat().format(limit);
}
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: var(--dd-space-4);
}

.billing-copy {
  margin-top: 0;
  color: var(--dd-color-text-muted);
}

@media (min-width: 48rem) {
  .dashboard-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
