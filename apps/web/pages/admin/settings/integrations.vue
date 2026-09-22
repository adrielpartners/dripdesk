<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Settings</p>
      <h1 class="page-header__title">Integrations</h1>
      <p class="page-header__description">Configure organization-owned SMS, Telegram, and email providers.</p>
    </header>

    <div v-if="pageError" class="notice notice--error" role="alert">{{ pageError }}</div>

    <section class="integration-grid">
      <div v-for="provider in providers" :key="provider.type" class="integration-item">
        <div
          v-if="notices[provider.type]"
          class="notice"
          :class="`notice--${notices[provider.type]?.tone}`"
          :role="notices[provider.type]?.tone === 'error' ? 'alert' : 'status'"
        >
          {{ notices[provider.type]?.message }}
        </div>
        <AppCard>
          <form class="provider-form" @submit.prevent="save(provider.type)">
          <div class="provider-form__header">
            <div>
              <h2>{{ provider.label }}</h2>
              <p>{{ provider.description }}</p>
            </div>
            <AppBadge :tone="credentialTone(provider.type)">
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

          <div class="provider-form__test">
            <AppInput
              v-model="testRecipients[provider.type]"
              :label="provider.testLabel"
              :placeholder="provider.testPlaceholder"
              :hint="provider.testHint"
              autocomplete="off"
            />
          </div>

          <div class="provider-form__actions">
            <AppButton type="submit" :disabled="pending === provider.type || testing[provider.type]">Save</AppButton>
            <AppButton variant="ghost" :disabled="pending === provider.type || testing[provider.type]" @click="test(provider.type)">Send test</AppButton>
          </div>
          </form>
        </AppCard>
      </div>
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
  {
    type: 'twilio' as const,
    label: 'Twilio SMS',
    description: 'Send SMS steps and receive SMS replies.',
    testLabel: 'Test phone number',
    testPlaceholder: '+15551234567',
    testHint: 'Enter the number that should receive the test SMS using saved settings.',
  },
  {
    type: 'telegram' as const,
    label: 'Telegram Bot',
    description: 'Send Telegram steps and receive bot replies.',
    testLabel: 'Test chat ID',
    testPlaceholder: '123456789',
    testHint: 'Enter the numeric chat ID that should receive the test message using saved settings.',
  },
  {
    type: 'smtp' as const,
    label: 'SMTP Email',
    description: 'Send email steps through your SMTP provider.',
    testLabel: 'Test email address',
    testPlaceholder: 'you@example.com',
    testHint: 'Enter the address that should receive the test email using saved settings.',
  },
];

const smtpPresets = [
  { label: 'Generic SMTP', value: 'generic' },
  { label: 'Brevo', value: 'brevo' },
  { label: 'SendGrid', value: 'sendgrid' },
  { label: 'Mailgun', value: 'mailgun' },
];

const credentials = ref<MaskedCredential[]>([]);
const pending = ref<ProviderType | ''>('');
const pageError = ref('');
type Notice = { tone: 'success' | 'error' | 'warning'; message: string };
const notices = reactive<Record<ProviderType, Notice | null>>({ twilio: null, telegram: null, smtp: null });
const testRecipients = reactive<Record<ProviderType, string>>({ twilio: '', telegram: '', smtp: '' });
const testing = reactive<Record<ProviderType, boolean>>({ twilio: false, telegram: false, smtp: false });
let pageActive = true;

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
onUnmounted(() => { pageActive = false; });

async function loadCredentials() {
  try {
    credentials.value = await apiRequest<MaskedCredential[]>('/provider-credentials');
    pageError.value = '';
    for (const credential of credentials.value) {
      if (credential.status === 'failed' && credential.lastError && !notices[credential.providerType]) {
        notices[credential.providerType] = { tone: 'error', message: `${providerLabel(credential.providerType)}: ${credential.lastError}` };
      }
    }
  } catch (caught) {
    pageError.value = caught instanceof Error ? caught.message : 'Could not load integration settings.';
  }
}

async function save(providerType: ProviderType) {
  if (testing[providerType]) return;
  pending.value = providerType;
  notices[providerType] = null;

  try {
    await apiRequest<MaskedCredential>(`/provider-credentials/${providerType}`, {
      method: 'PUT',
      body: payload(providerType),
    });
    await loadCredentials();
    notices[providerType] = { tone: 'success', message: `${providerLabel(providerType)} settings saved. Send a test message to verify delivery.` };
  } catch (caught) {
    notices[providerType] = { tone: 'error', message: caught instanceof Error ? caught.message : 'Provider settings could not be saved.' };
  } finally {
    pending.value = '';
  }
}

async function test(providerType: ProviderType) {
  if (testing[providerType]) return;
  pending.value = providerType;
  notices[providerType] = null;

  try {
    const { jobId } = await apiRequest<{ jobId: string; status: 'pending' }>(`/provider-credentials/${providerType}/test`, {
      method: 'POST',
      body: { recipient: testRecipients[providerType].trim() },
    });
    testing[providerType] = true;
    notices[providerType] = { tone: 'warning', message: `${providerLabel(providerType)} test is sending. Waiting for the provider response…` };
    void pollTest(providerType, jobId);
  } catch (caught) {
    notices[providerType] = { tone: 'error', message: caught instanceof Error ? caught.message : 'Provider test could not be started.' };
  } finally {
    pending.value = '';
  }
}

async function pollTest(providerType: ProviderType, jobId: string) {
  try {
    for (let attempt = 0; attempt < 30 && pageActive; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!pageActive) return;
      const result = await apiRequest<{ status: 'pending' | 'success' | 'failure'; message?: string }>(
        `/provider-credentials/${providerType}/test/${encodeURIComponent(jobId)}`,
      );
      if (result.status === 'pending') continue;
      notices[providerType] = result.status === 'success'
        ? { tone: 'success', message: `${providerLabel(providerType)} accepted the test message. Check the recipient inbox or device.` }
        : { tone: 'error', message: result.message ?? `${providerLabel(providerType)} could not send the test message.` };
      await loadCredentials();
      return;
    }
    if (pageActive) notices[providerType] = { tone: 'warning', message: 'The test is still processing. Refresh this page later to check its status.' };
  } catch (caught) {
    if (pageActive) notices[providerType] = { tone: 'error', message: caught instanceof Error ? caught.message : 'Could not check the test result.' };
  } finally {
    testing[providerType] = false;
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

function credentialTone(providerType: ProviderType): 'success' | 'danger' | 'neutral' {
  const status = credentialStatus(providerType).status;
  if (status === 'verified') return 'success';
  if (status === 'failed') return 'danger';
  return 'neutral';
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

.integration-item {
  display: grid;
  gap: var(--dd-space-3);
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

.provider-form__test {
  border-top: var(--dd-border-width) solid var(--dd-color-border);
  padding-top: var(--dd-space-4);
}

.notice {
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
  background: var(--dd-color-surface);
  padding: var(--dd-space-3);
}

.notice--error {
  border-color: var(--dd-color-danger);
  background: var(--dd-color-danger-soft);
  color: var(--dd-color-danger);
}

.notice--success {
  border-color: var(--dd-color-green-500);
  background: var(--dd-color-primary-soft);
  color: var(--dd-color-green-700);
}

.notice--warning {
  border-color: var(--dd-color-warning);
  background: var(--dd-color-warning-soft);
  color: var(--dd-color-warning);
}
</style>
