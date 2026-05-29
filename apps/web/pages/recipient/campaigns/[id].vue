<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Recipient</p>
      <h1 class="page-header__title">{{ campaign?.campaign.name ?? 'Campaign detail' }}</h1>
      <p class="page-header__description">
        {{ campaign?.campaign.description ?? 'Review delivered steps and completion progress.' }}
      </p>
    </header>

    <AppEmptyState v-if="error" title="Could not load campaign" :description="error" />

    <template v-else>
      <div class="dashboard-grid">
        <AppMetricCard label="Completed steps" :value="pending ? '-' : completedStepLabel" />
        <AppMetricCard label="Progress" :value="pending ? '-' : `${campaign?.progress.percent ?? 0}%`" />
        <AppMetricCard label="Status" :value="pending ? '-' : campaign?.status ?? '-'" />
      </div>

      <AppCard title="Steps">
        <AppTable label="Campaign steps">
          <thead>
            <tr>
              <th>Step</th>
              <th>Status</th>
              <th>Delivered</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="4">Loading campaign...</td>
            </tr>
            <tr v-for="step in visibleSteps" v-else :key="step.id">
              <td>
                <strong>{{ step.stepOrder }}. {{ step.title }}</strong>
                <p v-if="step.subject" class="table-note">{{ step.subject }}</p>
              </td>
              <td>
                <AppBadge :tone="step.status === 'completed' ? 'success' : 'neutral'">
                  {{ step.status }}
                </AppBadge>
              </td>
              <td>{{ formatDate(step.sentAt) }}</td>
              <td class="step-content">{{ step.content || 'Content has not been delivered yet.' }}</td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>

      <AppCard title="Preferences">
        <p class="preference-copy">You can stop this campaign without changing other assigned campaigns.</p>
        <AppButton variant="danger" :disabled="unsubscribePending || campaign?.status !== 'active'" @click="unsubscribeCampaign">
          {{ unsubscribePending ? 'Updating' : 'Unsubscribe from campaign' }}
        </AppButton>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '~/services/api-client';
import type { PortalCampaignDetail } from '~/types/portal';

definePageMeta({
  layout: 'recipient',
  middleware: 'recipient',
});

const route = useRoute();
const campaignId = computed(() => String(route.params.id));
const campaign = ref<PortalCampaignDetail | null>(null);
const pending = ref(false);
const unsubscribePending = ref(false);
const error = ref<string | null>(null);

const visibleSteps = computed(() => campaign.value?.steps ?? []);
const completedStepLabel = computed(() => {
  const progress = campaign.value?.progress;
  if (!progress) return '-';
  return `${progress.completedSteps} / ${progress.totalSteps}`;
});

onMounted(() => {
  void loadCampaign();
});

async function loadCampaign() {
  pending.value = true;
  error.value = null;

  try {
    campaign.value = await apiRequest<PortalCampaignDetail>(`/portal/campaigns/${campaignId.value}`);
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Campaign could not be loaded';
  } finally {
    pending.value = false;
  }
}

async function unsubscribeCampaign() {
  unsubscribePending.value = true;
  error.value = null;

  try {
    await apiRequest(`/portal/campaigns/${campaignId.value}/unsubscribe`, { method: 'POST' });
    await loadCampaign();
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Campaign unsubscribe failed';
  } finally {
    unsubscribePending.value = false;
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Not sent';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: var(--dd-space-4);
}

.table-note,
.preference-copy {
  margin: var(--dd-space-1) 0 0;
  color: var(--dd-color-text-muted);
  font-size: var(--dd-font-size-sm);
}

.step-content {
  max-width: 28rem;
  white-space: pre-wrap;
}

@media (min-width: 48rem) {
  .dashboard-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
