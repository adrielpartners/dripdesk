<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Admin</p>
      <h1 class="page-header__title">People</h1>
      <p class="page-header__description">Create recipient records and keep their reachable channels organized.</p>
    </header>

    <AppCard title="Add person">
      <form class="person-form" @submit.prevent="createPerson">
        <AppInput v-model="form.displayName" label="Display name" placeholder="Jordan Lee" />
        <AppInput v-model="form.timezone" label="Timezone" placeholder="America/New_York" />
        <AppSelect v-model="form.channelType" label="First channel" :options="channelOptions" />
        <AppInput v-model="form.address" label="Channel address" placeholder="person@example.com" />
        <AppInput v-model="tagText" label="Tags" placeholder="vip, spring-cohort" />
        <AppButton type="submit" :disabled="pending">
          {{ pending ? 'Saving' : 'Create person' }}
        </AppButton>
      </form>
    </AppCard>

    <AppCard title="People">
      <form class="person-search" @submit.prevent="loadPersons">
        <AppInput v-model="search" label="Search" placeholder="Name or channel address" />
        <AppButton type="submit" variant="secondary">Search</AppButton>
      </form>

      <AppEmptyState v-if="error" title="Could not load people" :description="error" />
      <AppEmptyState
        v-else-if="!pending && persons.length === 0"
        title="No people yet"
        description="Add the first recipient record above."
      />
      <AppTable v-else label="People">
        <thead>
          <tr>
            <th>Name</th>
            <th>Channels</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="person in persons" :key="person.id">
            <td>{{ person.displayName }}</td>
            <td>{{ formatChannels(person) }}</td>
            <td><AppBadge :tone="person.status === 'active' ? 'success' : 'warning'">{{ person.status }}</AppBadge></td>
            <td><NuxtLink :to="`/admin/persons/${person.id}`">View</NuxtLink></td>
          </tr>
        </tbody>
      </AppTable>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { PaginatedPersons, Person, PersonChannelType } from '~/types/persons';
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

const persons = ref<Person[]>([]);
const search = ref('');
const tagText = ref('');
const pending = ref(false);
const error = ref<string | null>(null);
const form = reactive({
  displayName: '',
  timezone: '',
  channelType: 'email' as PersonChannelType,
  address: '',
});

onMounted(() => {
  void loadPersons();
});

async function loadPersons() {
  pending.value = true;
  error.value = null;

  try {
    const query = new URLSearchParams({ page: '1', limit: '50' });
    if (search.value.trim()) query.set('search', search.value.trim());

    const response = await apiRequest<PaginatedPersons>(`/persons?${query.toString()}`);
    persons.value = response.data;
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'People could not be loaded';
  } finally {
    pending.value = false;
  }
}

async function createPerson() {
  pending.value = true;
  error.value = null;

  try {
    await apiRequest<Person>('/persons', {
      method: 'POST',
      body: {
        displayName: form.displayName,
        timezone: form.timezone || undefined,
        tags: tagText.value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        channels: form.address
          ? [
              {
                channelType: form.channelType,
                address: form.address,
              },
            ]
          : [],
      },
    });

    form.displayName = '';
    form.timezone = '';
    form.address = '';
    tagText.value = '';
    await loadPersons();
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Person could not be created';
  } finally {
    pending.value = false;
  }
}

function formatChannels(person: Person) {
  if (person.channels.length === 0) return 'No channels';
  return person.channels.map((channel) => `${channel.channelType}: ${channel.address}`).join(', ');
}
</script>

