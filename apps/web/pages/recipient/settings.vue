<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Recipient</p>
      <h1 class="page-header__title">Settings</h1>
      <p class="page-header__description">Review delivery channels and unsubscribe preferences.</p>
    </header>

    <AppEmptyState v-if="error" title="Could not load settings" :description="error" />

    <template v-else>
      <AppCard title="Channels">
        <AppEmptyState
          v-if="!pending && settings?.deletionRequested"
          title="Deletion requested"
          description="This recipient account is no longer available for delivery."
        />
        <AppEmptyState
          v-else-if="!pending && recipients.length === 0"
          title="No channel settings found"
          description="Delivery settings will appear after your account is connected to a recipient record."
        />
        <AppTable v-else label="Delivery channels">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Address</th>
              <th>Verification</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="4">Loading settings...</td>
            </tr>
            <template v-for="recipient in recipients" v-else :key="recipient.id">
              <tr v-for="channel in recipient.channels" :key="channel.id">
                <td>{{ channel.channelType }}</td>
                <td>{{ channel.address }}</td>
                <td>{{ channel.verificationStatus }}</td>
                <td>
                  <AppBadge :tone="channel.enabled && !channel.unsubscribed && !channel.suppressed ? 'success' : 'warning'">
                    {{ deliveryState(channel) }}
                  </AppBadge>
                </td>
              </tr>
            </template>
          </tbody>
        </AppTable>
      </AppCard>

      <AppCard title="Unsubscribe">
        <p class="settings-copy">Stop all delivery channels and remove active enrollments for this recipient account.</p>
        <AppButton variant="danger" :disabled="unsubscribePending || recipients.length === 0" @click="unsubscribeAll">
          {{ unsubscribePending ? 'Updating' : 'Unsubscribe from all' }}
        </AppButton>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '~/services/api-client';
import type { PortalSettings, PortalSettingsRecipient } from '~/types/portal';

definePageMeta({
  layout: 'recipient',
  middleware: 'recipient',
});

const settings = ref<PortalSettings | null>(null);
const pending = ref(false);
const unsubscribePending = ref(false);
const error = ref<string | null>(null);
const recipients = computed(() => settings.value?.recipients ?? []);

onMounted(() => {
  void loadSettings();
});

async function loadSettings() {
  pending.value = true;
  error.value = null;

  try {
    settings.value = await apiRequest<PortalSettings>('/portal/settings');
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Settings could not be loaded';
  } finally {
    pending.value = false;
  }
}

async function unsubscribeAll() {
  unsubscribePending.value = true;
  error.value = null;

  try {
    await apiRequest('/portal/unsubscribe-all', { method: 'POST' });
    await loadSettings();
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Unsubscribe failed';
  } finally {
    unsubscribePending.value = false;
  }
}

function deliveryState(channel: PortalSettingsRecipient['channels'][number]) {
  if (channel.suppressed) return 'suppressed';
  if (channel.unsubscribed) return 'unsubscribed';
  if (!channel.enabled) return 'disabled';
  return 'enabled';
}
</script>

<style scoped>
.settings-copy {
  margin-top: 0;
  color: var(--dd-color-text-muted);
}
</style>
