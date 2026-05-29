<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Settings</p>
      <h1 class="page-header__title">Integrations</h1>
      <p class="page-header__description">Configure organization-owned SMS, Telegram, and email providers.</p>
    </header>

    <div v-if="error" class="notice notice--error">{{ error }}</div>
    <div v-if="savedMessage" class="notice">{{ savedMessage }}</div>

    <section class="integration-grid">
      <AppCard v-for="provider in providers" :key="provider.type">
        <form class="provider-form" @submit.prevent="save(provider.type)">
          <div class="provider-form__header">
            <div>
              <h2>{{ provider.label }}</h2>
              <p>{{ provider.description }}</p>
            </div>
            <AppBadge :tone="credentialStatus(provider.type).status === 'verified' ? 'success' : 'neutral'">
              {{ credentialStatus(provider.type).label }}
            </AppBadge>
          </div>

          <template v-if="provider.type === 'twilio'">
            <AppInput v-model="twilio.accountSid" label="Account SID" autocomplete="off" />
            <AppInput v-model="twilio.authToken" label="Auth token" type="password" autocomplete="new-password" />
            <AppInput v-model="twilio.fromNumber" label="From number" placeholder="+15551234567" autocomplete="off" />
          </template>

          <template v-else-if="provider.type === 'telegram'">
            <AppInput v-model="telegram.botToken" label="Bot token" type="password" autocomplete="new-password" />
            <AppInput v-model="telegram.webhookSecret" label="Webhook secret" type="password" autocomplete="new-password" />
          </template>

          <template v-else>
            <AppSelect v-model="smtp.preset" label="Preset" :options="smtpPresets" />
            <AppInput v-model="smtp.host" label="SMTP host" autocomplete="off" />
            <AppInput v-model="smtp.port" label="SMTP port" type="number" autocomplete="off" />
            <AppInput v-model="smtp.username" label="Username" autocomplete="off" />
            <AppInput v-model="smtp.password" label="Password" type="password" autocomplete="new-password" />
            <AppInput v-model="smtp.fromEmail" label="From email" autocomplete="email" />
            <AppInput v-model="smtp.fromName" label="From name" autocomplete="off" />
          </template>

          <div class="provider-form__actions">
            <AppButton type="submit" :disabled="pending === provider.type">Save</AppButton>
            <AppButton variant="ghost" :disabled="pending === provider.type" @click="test(provider.type)">Test</AppButton>
          </div>
        </form>
      </AppCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { apiRequest } from '~/services/api-client';

type ProviderType = 'twilio' | 'telegram' | 'smtp';

interface MaskedCredential {
  providerType: ProviderType;
  status: 'configured' | 'verified' | 'failed';
  maskedConfig: Record<string, unknown>;
  lastError?: string | null;
}

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const providers = [
  { type: 'twilio' as const, label: 'Twilio SMS', description: 'Send SMS steps and receive SMS replies.' },
  { type: 'telegram' as const, label: 'Telegram Bot', description: 'Send Telegram steps and receive bot replies.' },
  { type: 'smtp' as const, label: 'SMTP Email', description: 'Send email steps through your SMTP provider.' },
];

const smtpPresets = [
  { label: 'Generic SMTP', value: 'generic' },
  { label: 'Brevo', value: 'brevo' },
  { label: 'SendGrid', value: 'sendgrid' },
  { label: 'Mailgun', value: 'mailgun' },
];

const credentials = ref<MaskedCredential[]>([]);
const pending = ref<ProviderType | ''>('');
const error = ref('');
const savedMessage = ref('');

const twilio = reactive({ accountSid: '', authToken: '', fromNumber: '' });
const telegram = reactive({ botToken: '', webhookSecret: '' });
const smtp = reactive({
  preset: 'generic',
  host: '',
  port: '587',
  username: '',
  password: '',
  fromEmail: '',
  fromName: '',
});

onMounted(loadCredentials);

async function loadCredentials() {
  credentials.value = await apiRequest<MaskedCredential[]>('/provider-credentials');
}

async function save(providerType: ProviderType) {
  pending.value = providerType;
  error.value = '';
  savedMessage.value = '';

  try {
    await apiRequest<MaskedCredential>(`/provider-credentials/${providerType}`, {
      method: 'PUT',
      body: payload(providerType),
    });
    await loadCredentials();
    savedMessage.value = `${providerLabel(providerType)} settings saved.`;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Provider settings could not be saved.';
  } finally {
    pending.value = '';
  }
}

async function test(providerType: ProviderType) {
  pending.value = providerType;
  error.value = '';
  savedMessage.value = '';

  try {
    await apiRequest<MaskedCredential>(`/provider-credentials/${providerType}/test`, { method: 'POST' });
    await loadCredentials();
    savedMessage.value = `${providerLabel(providerType)} settings validated.`;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Provider settings could not be tested.';
  } finally {
    pending.value = '';
  }
}

function payload(providerType: ProviderType) {
  if (providerType === 'twilio') return { providerType, ...twilio };
  if (providerType === 'telegram') return { providerType, ...telegram };
  return { providerType, ...smtp, port: Number(smtp.port), secure: Number(smtp.port) === 465 };
}

function credentialStatus(providerType: ProviderType) {
  const credential = credentials.value.find((item) => item.providerType === providerType);
  if (!credential) return { status: 'configured', label: 'Not saved' };
  if (credential.status === 'verified') return { status: credential.status, label: 'Verified' };
  if (credential.status === 'failed') return { status: credential.status, label: 'Needs attention' };
  return { status: credential.status, label: 'Saved' };
}

function providerLabel(providerType: ProviderType) {
  return providers.find((provider) => provider.type === providerType)?.label ?? 'Provider';
}
</script>

<style scoped>
.integration-grid {
  display: grid;
  gap: var(--dd-space-4);
}

.provider-form {
  display: grid;
  gap: var(--dd-space-4);
}

.provider-form__header,
.provider-form__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dd-space-3);
}

.provider-form__header h2 {
  margin: 0;
  font-size: var(--dd-font-size-lg);
}

.provider-form__header p {
  margin: var(--dd-space-1) 0 0;
  color: var(--dd-color-text-muted);
}

.provider-form__actions {
  justify-content: flex-start;
}

.notice {
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  padding: var(--dd-space-3);
}

.notice--error {
  border-color: var(--dd-color-danger);
  color: var(--dd-color-danger);
}
</style>
