<template>
  <main class="unsubscribe-page">
    <section class="unsubscribe-panel">
      <p class="unsubscribe-panel__eyebrow">DripDesk</p>
      <h1>Manage message preferences</h1>

      <p v-if="context" class="unsubscribe-panel__copy">
        {{ context.person.displayName }}
        <span v-if="context.campaign">is subscribed to {{ context.campaign.name }}.</span>
      </p>
      <p v-else class="unsubscribe-panel__copy">{{ loading ? 'Loading preferences...' : statusMessage }}</p>

      <div v-if="context && !completed" class="unsubscribe-actions">
        <AppButton variant="secondary" @click="apply('campaign')">Unsubscribe from this campaign</AppButton>
        <AppButton variant="ghost" @click="apply('global')">Unsubscribe from all campaigns</AppButton>
        <AppButton variant="danger" @click="apply('delete')">Delete my account</AppButton>
      </div>

      <p v-if="completed" class="unsubscribe-panel__result">{{ statusMessage }}</p>
      <p v-if="error" class="unsubscribe-panel__error">{{ error }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { apiRequest } from '~/services/api-client';

type UnsubscribeAction = 'campaign' | 'global' | 'delete';

interface UnsubscribeContext {
  campaignScoped: boolean;
  person: {
    displayName: string;
    status: string;
  };
  campaign: {
    name: string;
  } | null;
}

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const token = computed(() => String(route.params.token ?? ''));
const context = ref<UnsubscribeContext | null>(null);
const loading = ref(true);
const completed = ref(false);
const error = ref('');
const statusMessage = ref('');

onMounted(load);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    context.value = await apiRequest<UnsubscribeContext>(`/unsubscribe/${token.value}`);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'This unsubscribe link could not be loaded.';
  } finally {
    loading.value = false;
  }
}

async function apply(action: UnsubscribeAction) {
  error.value = '';
  try {
    await apiRequest(`/unsubscribe/${token.value}`, {
      method: 'POST',
      body: { action },
    });
    completed.value = true;
    statusMessage.value =
      action === 'delete'
        ? 'Your deletion request has been recorded and future messages have been disabled.'
        : 'Your message preferences have been updated.';
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'This request could not be completed.';
  }
}
</script>

<style scoped>
.unsubscribe-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  background: var(--dd-color-surface-muted);
  padding: var(--dd-space-5);
}

.unsubscribe-panel {
  display: grid;
  width: min(100%, 34rem);
  gap: var(--dd-space-4);
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-lg);
  background: var(--dd-color-surface);
  padding: var(--dd-space-6);
}

.unsubscribe-panel__eyebrow {
  margin: 0;
  color: var(--dd-color-text-muted);
  font-size: var(--dd-font-size-sm);
  font-weight: var(--dd-font-weight-semibold);
}

.unsubscribe-panel h1,
.unsubscribe-panel__copy,
.unsubscribe-panel__result,
.unsubscribe-panel__error {
  margin: 0;
}

.unsubscribe-actions {
  display: grid;
  gap: var(--dd-space-3);
}

.unsubscribe-panel__copy {
  color: var(--dd-color-text-muted);
}

.unsubscribe-panel__error {
  color: var(--dd-color-danger);
}
</style>
