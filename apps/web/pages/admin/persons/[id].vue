<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">People</p>
      <h1 class="page-header__title">{{ person?.displayName ?? 'Person detail' }}</h1>
      <p class="page-header__description">Edit recipient identity fields and manage reachable channels.</p>
    </header>

    <AppEmptyState v-if="error" title="Could not load person" :description="error" />
    <template v-else-if="person">
      <AppCard title="Profile">
        <form class="person-form" @submit.prevent="savePerson">
          <AppInput v-model="form.displayName" label="Display name" />
          <AppInput v-model="form.timezone" label="Timezone" placeholder="America/New_York" />
          <AppInput v-model="tagText" label="Tags" placeholder="vip, spring-cohort" />
          <div class="person-actions">
            <AppButton type="submit" :disabled="pending">Save profile</AppButton>
            <AppButton type="button" variant="secondary" :disabled="pending" @click="requestDeletion">
              Mark deletion requested
            </AppButton>
            <AppButton type="button" variant="danger" :disabled="pending" @click="archivePerson">
              Archive
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard title="Channels">
        <form class="person-form" @submit.prevent="addChannel">
          <AppSelect v-model="channelForm.channelType" label="Channel" :options="channelOptions" />
          <AppInput v-model="channelForm.address" label="Address" placeholder="person@example.com" />
          <label class="person-checkbox">
            <input v-model="channelForm.enabled" type="checkbox" />
            Enabled
          </label>
          <AppButton type="submit" :disabled="pending">Add channel</AppButton>
        </form>

        <AppTable label="Person channels">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Address</th>
              <th>Enabled</th>
              <th>Verification</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="channel in person.channels" :key="channel.id">
              <td>{{ channel.channelType }}</td>
              <td>{{ channel.address }}</td>
              <td>{{ channel.enabled ? 'Yes' : 'No' }}</td>
              <td>{{ channel.verificationStatus }}</td>
              <td>
                <AppButton type="button" size="sm" variant="ghost" @click="toggleChannel(channel)">
                  {{ channel.enabled ? 'Disable' : 'Enable' }}
                </AppButton>
              </td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>

      <AppCard title="Enrollments">
        <form class="person-form" @submit.prevent="enrollSelectedCampaign">
          <AppSelect v-model="selectedCampaignId" label="Add campaign" :options="campaignOptions" />
          <AppButton type="submit" :disabled="pending || !selectedCampaignId">Add campaign to person</AppButton>
        </form>

        <AppEmptyState
          v-if="enrollments.length === 0"
          title="No enrollments yet"
          description="Add this person to an active campaign."
        />
        <AppTable v-else label="Person enrollments">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Current step</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enrollment in enrollments" :key="enrollment.id">
              <td>{{ enrollment.campaign.name }}</td>
              <td><AppBadge :tone="enrollment.status === 'active' ? 'success' : 'neutral'">{{ enrollment.status }}</AppBadge></td>
              <td>Step {{ enrollment.currentStepOrder }}</td>
              <td>
                <NuxtLink :to="`/admin/campaigns/${enrollment.campaignId}`">Open</NuxtLink>
              </td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { Person, PersonChannel, PersonChannelType } from '~/types/persons';
import type { Campaign, PaginatedCampaigns } from '~/types/campaigns';
import type { Enrollment, PaginatedEnrollments } from '~/types/enrollments';
import { apiRequest } from '~/services/api-client';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const personId = String(route.params.id);
const person = ref<Person | null>(null);
const enrollments = ref<Enrollment[]>([]);
const campaignOptions = ref<Array<{ label: string; value: string }>>([]);
const selectedCampaignId = ref('');
const pending = ref(false);
const error = ref<string | null>(null);
const tagText = ref('');
const form = reactive({
  displayName: '',
  timezone: '',
});
const channelForm = reactive({
  channelType: 'email' as PersonChannelType,
  address: '',
  enabled: true,
});
const channelOptions = [
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'Telegram', value: 'telegram' },
];

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  await Promise.all([loadPerson(), loadEnrollments(), loadCampaigns()]);
}

async function loadPerson() {
  pending.value = true;
  error.value = null;

  try {
    person.value = await apiRequest<Person>(`/persons/${personId}`);
    form.displayName = person.value.displayName;
    form.timezone = person.value.timezone ?? '';
    tagText.value = person.value.tags.join(', ');
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Person could not be loaded';
  } finally {
    pending.value = false;
  }
}

async function loadEnrollments() {
  try {
    const response = await apiRequest<PaginatedEnrollments>(`/persons/${personId}/enrollments?page=1&limit=50`);
    enrollments.value = response.data;
  } catch {
    enrollments.value = [];
  }
}

async function loadCampaigns() {
  try {
    const response = await apiRequest<PaginatedCampaigns>('/campaigns?page=1&limit=100');
    campaignOptions.value = response.data
      .filter((campaign: Campaign) => campaign.status === 'active')
      .map((campaign) => ({ label: campaign.name, value: campaign.id }));
  } catch {
    campaignOptions.value = [];
  }
}

async function savePerson() {
  await mutatePerson(() =>
    apiRequest<Person>(`/persons/${personId}`, {
      method: 'PATCH',
      body: {
        displayName: form.displayName,
        timezone: form.timezone || undefined,
        tags: tagText.value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
    }),
  );
}

async function addChannel() {
  await mutatePerson(() =>
    apiRequest<PersonChannel>(`/persons/${personId}/channels`, {
      method: 'POST',
      body: channelForm,
    }),
  );
  channelForm.address = '';
}

async function toggleChannel(channel: PersonChannel) {
  await mutatePerson(() =>
    apiRequest<PersonChannel>(`/persons/${personId}/channels/${channel.id}`, {
      method: 'PATCH',
      body: { enabled: !channel.enabled },
    }),
  );
}

async function requestDeletion() {
  await mutatePerson(() =>
    apiRequest<Person>(`/persons/${personId}/request-deletion`, {
      method: 'POST',
    }),
  );
}

async function archivePerson() {
  await mutatePerson(() =>
    apiRequest<Person>(`/persons/${personId}`, {
      method: 'DELETE',
    }),
  );
  await navigateTo('/admin/persons');
}

async function enrollSelectedCampaign() {
  if (!selectedCampaignId.value) return;
  await mutateEnrollment(() =>
    apiRequest<Enrollment>(`/persons/${personId}/enrollments`, {
      method: 'POST',
      body: { campaignId: selectedCampaignId.value },
    }),
  );
  selectedCampaignId.value = '';
}

async function mutatePerson(action: () => Promise<unknown>) {
  pending.value = true;
  error.value = null;

  try {
    await action();
    await loadPerson();
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Person could not be updated';
  } finally {
    pending.value = false;
  }
}

async function mutateEnrollment(action: () => Promise<unknown>) {
  pending.value = true;
  error.value = null;

  try {
    await action();
    await loadEnrollments();
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Enrollment could not be updated';
  } finally {
    pending.value = false;
  }
}
</script>
