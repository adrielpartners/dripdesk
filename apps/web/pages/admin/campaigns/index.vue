<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Admin</p>
      <h1 class="page-header__title">Campaigns</h1>
      <p class="page-header__description">Create linear micro-course campaigns and manage their setup.</p>
    </header>

    <AppCard title="Create campaign">
      <form class="campaign-form" @submit.prevent="createCampaign">
        <AppInput v-model="form.name" label="Name" placeholder="7-day onboarding drip" />
        <AppInput v-model="form.description" label="Description" placeholder="Short lessons for new recipients" />
        <AppSelect v-model="form.scheduleType" label="Schedule" :options="scheduleOptions" />
        <AppInput v-model="form.sendTime" label="Send time" placeholder="09:00" />
        <AppInput
          v-if="form.scheduleType === 'custom_interval'"
          v-model="form.intervalDays"
          label="Interval days"
          type="number"
        />
        <AppInput
          v-if="form.scheduleType === 'custom_days_of_week'"
          v-model="form.daysOfWeek"
          label="Days of week"
          placeholder="1,3,5"
        />
        <AppSelect v-model="form.progressRule" label="Progress rule" :options="progressOptions" />
        <AppSelect v-model="form.mode" label="Mode" :options="modeOptions" />
        <fieldset class="channel-fieldset">
          <legend>Default channels</legend>
          <label v-for="channel in channelOptions" :key="channel.value" class="campaign-checkbox">
            <input v-model="form.defaultChannels" type="checkbox" :value="channel.value" />
            {{ channel.label }}
          </label>
        </fieldset>
        <AppButton type="submit" :disabled="pending">
          {{ pending ? 'Saving' : 'Create campaign' }}
        </AppButton>
      </form>
    </AppCard>

    <AppCard title="Campaigns">
      <AppEmptyState v-if="error" title="Could not load campaigns" :description="error" />
      <AppEmptyState
        v-else-if="!pending && campaigns.length === 0"
        title="No campaigns yet"
        description="Create the first linear drip campaign above."
      />
      <AppTable v-else label="Campaigns">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Schedule</th>
            <th>Steps</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="campaign in campaigns" :key="campaign.id">
            <td>{{ campaign.name }}</td>
            <td><AppBadge :tone="campaign.status === 'active' ? 'success' : 'neutral'">{{ campaign.status }}</AppBadge></td>
            <td>{{ campaign.scheduleType }}</td>
            <td>{{ campaign._count?.steps ?? 0 }}</td>
            <td><NuxtLink :to="`/admin/campaigns/${campaign.id}`">Edit</NuxtLink></td>
          </tr>
        </tbody>
      </AppTable>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type {
  Campaign,
  CampaignChannel,
  CampaignMode,
  CampaignProgressRule,
  CampaignScheduleType,
  PaginatedCampaigns,
} from '~/types/campaigns';
import { apiRequest } from '~/services/api-client';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const channelOptions = [
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'Telegram', value: 'telegram' },
];
const scheduleOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Monday/Wednesday/Friday', value: 'monday_wednesday_friday' },
  { label: 'Custom interval', value: 'custom_interval' },
  { label: 'Custom days of week', value: 'custom_days_of_week' },
];
const progressOptions = [
  { label: 'Time-based', value: 'time_based' },
  { label: 'Link click required', value: 'link_click_required' },
  { label: 'Reply required', value: 'reply_required' },
];
const modeOptions = [
  { label: 'Standard', value: 'standard' },
  { label: 'Advanced', value: 'advanced' },
];

const campaigns = ref<Campaign[]>([]);
const pending = ref(false);
const error = ref<string | null>(null);
const form = reactive({
  name: '',
  description: '',
  scheduleType: 'daily' as CampaignScheduleType,
  sendTime: '09:00',
  intervalDays: '1',
  daysOfWeek: '1,3,5',
  progressRule: 'time_based' as CampaignProgressRule,
  mode: 'standard' as CampaignMode,
  defaultChannels: ['email'] as CampaignChannel[],
});

onMounted(() => {
  void loadCampaigns();
});

async function loadCampaigns() {
  pending.value = true;
  error.value = null;

  try {
    const response = await apiRequest<PaginatedCampaigns>('/campaigns?page=1&limit=50');
    campaigns.value = response.data;
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Campaigns could not be loaded';
  } finally {
    pending.value = false;
  }
}

async function createCampaign() {
  pending.value = true;
  error.value = null;

  try {
    const campaign = await apiRequest<Campaign>('/campaigns', {
      method: 'POST',
      body: {
        name: form.name,
        description: form.description || undefined,
        scheduleType: form.scheduleType,
        scheduleConfig: scheduleConfigPayload(),
        progressRule: form.progressRule,
        mode: form.mode,
        defaultChannels: form.defaultChannels,
      },
    });

    await navigateTo(`/admin/campaigns/${campaign.id}`);
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Campaign could not be created';
  } finally {
    pending.value = false;
  }
}

function scheduleConfigPayload() {
  return {
    sendTime: form.sendTime || undefined,
    intervalDays: form.scheduleType === 'custom_interval' ? Number(form.intervalDays || 1) : undefined,
    daysOfWeek:
      form.scheduleType === 'custom_days_of_week'
        ? form.daysOfWeek
            .split(',')
            .map((day) => Number(day.trim()))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : undefined,
  };
}
</script>
