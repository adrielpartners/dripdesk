<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Recipient</p>
      <h1 class="page-header__title">My lessons</h1>
      <p class="page-header__description">Assigned campaigns, current progress, and completed lesson history.</p>
    </header>

    <AppEmptyState v-if="error" title="Could not load lessons" :description="error" />

    <template v-else>
      <div class="dashboard-grid">
        <AppMetricCard label="Assigned campaigns" :value="pending ? '-' : campaigns.length" />
        <AppMetricCard label="Completed campaigns" :value="pending ? '-' : completedCampaigns" />
        <AppMetricCard label="Average progress" :value="pending ? '-' : `${averageProgress}%`" />
      </div>

      <AppCard title="Campaigns">
        <AppEmptyState
          v-if="!pending && dashboard?.deletionRequested"
          title="Deletion requested"
          description="This recipient account is no longer available for lesson delivery."
        />
        <AppEmptyState
          v-else-if="!pending && campaigns.length === 0"
          title="No assigned lessons yet"
          description="Your assigned drip campaigns will appear here after enrollment."
        />
        <AppTable v-else label="Assigned campaigns">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Completed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="5">Loading lessons...</td>
            </tr>
            <tr v-for="campaign in campaigns" v-else :key="campaign.enrollmentId">
              <td>
                <strong>{{ campaign.name }}</strong>
                <p v-if="campaign.description" class="table-note">{{ campaign.description }}</p>
              </td>
              <td>
                <AppBadge :tone="campaign.status === 'completed' ? 'success' : 'neutral'">
                  {{ campaign.status }}
                </AppBadge>
              </td>
              <td>{{ campaign.progress.completedSteps }} / {{ campaign.progress.totalSteps }} steps</td>
              <td>{{ campaign.progress.percent }}%</td>
              <td><NuxtLink :to="`/recipient/campaigns/${campaign.id}`">View</NuxtLink></td>
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
import type { PortalDashboard } from '~/types/portal';

definePageMeta({
  layout: 'recipient',
  middleware: 'recipient',
});

const dashboard = ref<PortalDashboard | null>(null);
const pending = ref(false);
const error = ref<string | null>(null);

const campaigns = computed(() => dashboard.value?.campaigns ?? []);
const completedCampaigns = computed(() => campaigns.value.filter((campaign) => campaign.status === 'completed').length);
const averageProgress = computed(() => {
  if (!campaigns.value.length) return 0;
  const total = campaigns.value.reduce((sum, campaign) => sum + campaign.progress.percent, 0);
  return Math.round(total / campaigns.value.length);
});

onMounted(() => {
  void loadDashboard();
});

async function loadDashboard() {
  pending.value = true;
  error.value = null;

  try {
    dashboard.value = await apiRequest<PortalDashboard>('/portal');
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Lessons could not be loaded';
  } finally {
    pending.value = false;
  }
}
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: var(--dd-space-4);
}

.table-note {
  margin: var(--dd-space-1) 0 0;
  color: var(--dd-color-text-muted);
  font-size: var(--dd-font-size-sm);
}

@media (min-width: 48rem) {
  .dashboard-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
