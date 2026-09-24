<template>
  <div class="page-stack">
    <header class="welcome-banner">
      <div>
        <p class="page-header__eyebrow">Your dashboard · The big picture</p>
        <h1 class="welcome-banner__title">Good things,<br />on repeat.</h1>
        <p class="welcome-banner__copy">Little lessons make a lasting difference. Here's how your people and campaigns are getting along.</p>
        <div class="welcome-banner__actions">
          <NuxtLink class="action-link" to="/admin/campaigns">Create a campaign <span aria-hidden="true">↗</span></NuxtLink>
          <NuxtLink class="action-link action-link--quiet" to="/admin/persons">Meet your people <span aria-hidden="true">→</span></NuxtLink>
        </div>
      </div>
      <AppDeliveryArt />
    </header>

    <AppEmptyState v-if="error" tone="danger" title="Could not load dashboard" :description="error" />

    <template v-else>
      <div class="dashboard-grid">
        <AppMetricCard
          label="Active contacts"
          :value="pending ? '-' : metrics.activeContacts"
          :detail="`Enrolled in the last ${activeContactWindowDays} days`"
        />
        <AppMetricCard
          label="Average open rate"
          :value="pending ? '-' : formatRate(metrics.averageOpenRate)"
          detail="Opened events divided by sent messages"
        />
        <AppMetricCard
          label="Average click rate"
          :value="pending ? '-' : formatRate(metrics.averageClickRate)"
          detail="Clicked events divided by sent messages"
        />
        <AppMetricCard
          label="Average completion rate"
          :value="pending ? '-' : formatRate(metrics.averageCompletionRate)"
          detail="Completed enrollments divided by enrolled contacts"
        />
      </div>

      <AppCard title="Campaign performance">
        <AppEmptyState
          v-if="!pending && dashboard && dashboard.campaignCount === 0"
          title="No campaigns yet"
        description="Your next good idea belongs here. Create a campaign, add a few lessons, and invite your people along."
        >
          <template #actions>
            <NuxtLink to="/admin/campaigns">
              <AppButton>Create campaign</AppButton>
            </NuxtLink>
          </template>
        </AppEmptyState>

        <AppEmptyState
          v-else-if="!pending && campaignPerformance.length === 0"
          title="No campaign activity yet"
          description="Campaigns will appear here after people are enrolled and messages begin sending."
        />

        <AppTable v-else label="Campaign performance">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Active enrolled</th>
              <th>Open</th>
              <th>Click</th>
              <th>Completion</th>
              <th>Last sent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="7">Loading dashboard metrics...</td>
            </tr>
            <tr v-for="campaign in campaignPerformance" v-else :key="campaign.id">
              <td>
                <NuxtLink :to="`/admin/campaigns/${campaign.id}`">{{ campaign.name }}</NuxtLink>
              </td>
              <td>
                <AppBadge :tone="campaign.status === 'active' ? 'success' : 'neutral'">
                  {{ campaign.status }}
                </AppBadge>
              </td>
              <td>{{ campaign.activeEnrolledCount }}</td>
              <td>{{ formatRate(campaign.openRate) }}</td>
              <td>{{ formatRate(campaign.clickRate) }}</td>
              <td>{{ formatRate(campaign.completionRate) }}</td>
              <td>{{ formatDate(campaign.lastSentAt) }}</td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '~/services/api-client';
import type { CampaignPerformance, DashboardSummary } from '~/types/dashboard';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const dashboard = ref<DashboardSummary | null>(null);
const pending = ref(false);
const error = ref<string | null>(null);

const metrics = computed(
  () =>
    dashboard.value?.metrics ?? {
      activeContacts: 0,
      averageOpenRate: 0,
      averageClickRate: 0,
      averageCompletionRate: 0,
    },
);
const campaignPerformance = computed<CampaignPerformance[]>(() => dashboard.value?.campaignPerformance ?? []);
const activeContactWindowDays = computed(() => dashboard.value?.meta.activeContactWindowDays ?? 30);

onMounted(() => {
  void loadDashboard();
});

async function loadDashboard() {
  pending.value = true;
  error.value = null;

  try {
    dashboard.value = await apiRequest<DashboardSummary>('/dashboard');
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Dashboard could not be loaded';
  } finally {
    pending.value = false;
  }
}

function formatRate(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatDate(value: string | null) {
  if (!value) return 'Not sent';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: var(--dd-space-4);
}

@media (min-width: 48rem) {
  .dashboard-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
