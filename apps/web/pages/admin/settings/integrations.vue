<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Settings</p>
      <h1 class="page-header__title">Integrations</h1>
      <p class="page-header__description">Configure delivery providers and subscriber intake.</p>
      <a href="#subscriber-intake">How to enroll subscribers with a webhook ↓</a>
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
          <dl v-if="notices[provider.type]?.diagnostic" class="notice__diagnostic">
            <template v-if="notices[provider.type]?.diagnostic?.stage">
              <dt>Stage</dt><dd>{{ notices[provider.type]?.diagnostic?.stage }}</dd>
            </template>
            <template v-if="notices[provider.type]?.diagnostic?.code">
              <dt>Code</dt><dd>{{ notices[provider.type]?.diagnostic?.code }}</dd>
            </template>
            <template v-if="notices[provider.type]?.diagnostic?.providerCode">
              <dt>Provider code</dt><dd>{{ notices[provider.type]?.diagnostic?.providerCode }}</dd>
            </template>
            <template v-if="notices[provider.type]?.diagnostic?.httpStatus">
              <dt>HTTP status</dt><dd>{{ notices[provider.type]?.diagnostic?.httpStatus }}</dd>
            </template>
            <template v-if="notices[provider.type]?.diagnostic?.detail">
              <dt>Provider response</dt><dd>{{ notices[provider.type]?.diagnostic?.detail }}</dd>
            </template>
          </dl>
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
            <AppInput v-model="twilio.accountSid" label="Account SID" :hint="savedFieldHint('twilio', 'accountSid')" placeholder="Leave blank to keep saved" autocomplete="off" />
            <AppInput v-model="twilio.authToken" label="Auth token" :hint="savedFieldHint('twilio', 'authToken')" placeholder="Leave blank to keep saved" type="password" autocomplete="new-password" />
            <AppInput v-model="twilio.fromNumber" label="From number" placeholder="+15551234567" autocomplete="off" />
          </template>

          <template v-else-if="provider.type === 'telegram'">
            <AppInput v-model="telegram.botToken" label="Bot token" :hint="savedFieldHint('telegram', 'botToken')" placeholder="Leave blank to keep saved" type="password" autocomplete="new-password" />
            <AppInput v-model="telegram.webhookSecret" label="Webhook secret (required for replies)" :hint="savedFieldHint('telegram', 'webhookSecret')" placeholder="Leave blank to keep saved" type="password" autocomplete="new-password" />
          </template>

          <template v-else>
            <AppSelect v-model="smtp.preset" label="Preset" :options="smtpPresets" />
            <AppInput v-model="smtp.host" label="SMTP host" autocomplete="off" />
            <AppInput v-model="smtp.port" label="SMTP port" type="number" autocomplete="off" />
            <AppSelect v-model="smtp.secure" label="Connection security" :options="smtpSecurityOptions" />
            <AppInput v-model="smtp.username" label="Username" :hint="savedFieldHint('smtp', 'username')" placeholder="Leave blank to keep saved" autocomplete="off" />
            <AppInput v-model="smtp.password" label="Password" :hint="savedFieldHint('smtp', 'password')" placeholder="Leave blank to keep saved" type="password" autocomplete="new-password" />
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

    <div v-if="intakeNotice" class="notice" :class="`notice--${intakeNotice.tone}`" role="status">{{ intakeNotice.message }}</div>
    <AppCard id="subscriber-intake">
      <div class="provider-form">
        <div class="provider-form__header">
          <div>
            <h2>Subscriber intake webhook</h2>
            <p>Let another platform add a consenting contact and enroll them in an active campaign.</p>
          </div>
          <AppBadge :tone="intakeSettings?.configured ? 'success' : 'neutral'">{{ intakeSettings?.configured ? 'Ready' : 'Not set up' }}</AppBadge>
        </div>
        <ol class="intake-steps">
          <li>Open <NuxtLink to="/admin/campaigns">Campaigns</NuxtLink>, copy the campaign ID, and make sure the campaign is active with a published step.</li>
          <li>Generate an intake key below and save it in the sending platform. The key appears only once; if it is lost, rotate it.</li>
          <li>Configure that platform to POST JSON to this endpoint with the two headers and body shown below.</li>
          <li>Send one test signup. A successful response returns a person ID and enrollment ID; check People and campaign enrollments. The first message follows the campaign schedule.</li>
        </ol>
        <AppCopyableText v-if="intakeUrl" :value="intakeUrl" label="POST endpoint" copy-label="subscriber intake endpoint" />
        <AppCopyableText v-if="intakeKey" :value="intakeKey" label="Secret key — copy now; it cannot be shown again" copy-label="subscriber intake secret key" />
        <p v-else-if="intakeSettings?.configured">A key is already configured but cannot be shown again. Use the copy you saved, or rotate it below to make a new one.</p>
        <AppButton type="button" :disabled="intakePending" @click="rotateIntakeKey">{{ intakeSettings?.configured ? 'Rotate secret key' : 'Generate secret key' }}</AppButton>
        <p v-if="intakeSettings?.configured">Rotating immediately invalidates the previous key. Update the sending platform before its next webhook.</p>
        <div class="intake-detail">
          <strong>Required request headers</strong>
          <code>Content-Type: application/json<br>X-DripDesk-Intake-Key: YOUR_INTAKE_KEY</code>
        </div>
        <AppCopyableText :value="intakeExample" label="Example request (replace the key, campaign ID, and subscriber data)" copy-label="subscriber intake example request" />
        <p>Use a distinct <code>eventId</code> for every signup. Reuse that same ID and identical data when retrying a failed request. Set <code>consent</code> to true only when the person agreed to receive messages. Supply at least one of email, phone (E.164 format), or Telegram chat ID.</p>
      </div>
    </AppCard>
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

const smtpSecurityOptions = [
  { label: 'STARTTLS / standard (usually port 587)', value: 'false' },
  { label: 'Implicit TLS (usually port 465)', value: 'true' },
];

const credentials = ref<MaskedCredential[]>([]);
const auth = useAuthSession();
const runtime = useRuntimeConfig();
const intakeSettings = ref<{ configured: boolean; createdAt: string | null } | null>(null);
const intakeKey = ref('');
const intakePending = ref(false);
const intakeNotice = ref<{ tone: 'success' | 'error' | 'warning'; message: string } | null>(null);
const intakeUrl = computed(() => auth.user.value?.organizationId
  ? `${runtime.public.apiUrl.replace(/\/$/, '')}/webhooks/subscribers/${auth.user.value.organizationId}` : '');
const intakeExample = computed(() => `curl -X POST '${intakeUrl.value || 'https://api.dripdesk.net/api/webhooks/subscribers/ORGANIZATION_ID'}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-DripDesk-Intake-Key: YOUR_INTAKE_KEY' \\
  --data '{"eventId":"signup-123","campaignId":"CAMPAIGN_ID","displayName":"Jordan Lee","email":"jordan@example.com","consent":true}'`);
let formHydrated = false;
const pending = ref<ProviderType | ''>('');
const pageError = ref('');
interface ProviderDiagnostic {
  stage: string;
  code?: string;
  providerCode?: string;
  httpStatus?: number;
  detail?: string;
}
type Notice = { tone: 'success' | 'error' | 'warning'; message: string; diagnostic?: ProviderDiagnostic };
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
  secure: 'false',
  username: '',
  password: '',
  fromEmail: '',
  fromName: '',
});

onMounted(() => { void loadCredentials(); void loadIntakeSettings(); });
onUnmounted(() => { pageActive = false; });

async function loadIntakeSettings() {
  try {
    intakeSettings.value = await apiRequest<{ configured: boolean; createdAt: string | null }>('/subscriber-intake');
  } catch (caught) {
    intakeNotice.value = { tone: 'error', message: caught instanceof Error ? caught.message : 'Could not load subscriber intake settings.' };
  }
}

async function rotateIntakeKey() {
  if (intakeSettings.value?.configured && !window.confirm('Rotate the subscriber intake key? The existing key will stop working immediately.')) return;
  intakePending.value = true;
  intakeNotice.value = null;
  try {
    const result = await apiRequest<{ key: string }>('/subscriber-intake/rotate-key', { method: 'POST' });
    intakeKey.value = result.key;
    await loadIntakeSettings();
    intakeNotice.value = { tone: 'success', message: 'Secret key created. Copy it into the sending platform now; DripDesk will not display it again.' };
  } catch (caught) {
    intakeNotice.value = { tone: 'error', message: caught instanceof Error ? caught.message : 'Could not generate the subscriber intake key.' };
  } finally {
    intakePending.value = false;
  }
}

async function loadCredentials() {
  try {
    credentials.value = await apiRequest<MaskedCredential[]>('/provider-credentials');
    pageError.value = '';
    if (!formHydrated) {
      hydrateSavedSettings();
      formHydrated = true;
    }
    for (const credential of credentials.value) {
      if (credential.status === 'failed' && credential.lastError && !notices[credential.providerType]) {
        notices[credential.providerType] = { tone: 'error', message: `${providerLabel(credential.providerType)}: ${credential.lastError}` };
      }
    }
  } catch (caught) {
    pageError.value = caught instanceof Error ? caught.message : 'Could not load integration settings.';
  }
}

function hydrateSavedSettings() {
  const sms = credentials.value.find((item) => item.providerType === 'twilio')?.maskedConfig;
  twilio.fromNumber = savedText(sms?.fromNumber);

  const email = credentials.value.find((item) => item.providerType === 'smtp')?.maskedConfig;
  const preset = savedText(email?.preset);
  smtp.preset = smtpPresets.some((item) => item.value === preset) ? preset : 'generic';
  smtp.host = savedText(email?.host);
  smtp.port = email?.port == null ? '587' : String(email.port);
  smtp.secure = email?.secure === true ? 'true' : 'false';
  smtp.fromEmail = savedText(email?.fromEmail);
  smtp.fromName = savedText(email?.fromName);
}

function savedText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function savedFieldHint(providerType: ProviderType, field: string): string {
  const masked = credentials.value.find((item) => item.providerType === providerType)?.maskedConfig[field];
  return typeof masked === 'string' && masked ? `Saved: ${masked}. Leave blank to keep it.` : 'Not saved yet.';
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
      const result = await apiRequest<{ status: 'pending' | 'success' | 'failure'; message?: string; diagnostic?: ProviderDiagnostic }>(
        `/provider-credentials/${providerType}/test/${encodeURIComponent(jobId)}`,
      );
      if (result.status === 'pending') continue;
      notices[providerType] = result.status === 'success'
        ? { tone: 'success', message: `${providerLabel(providerType)} accepted the test message. Check the recipient inbox or device.` }
        : { tone: 'error', message: `${providerLabel(providerType)} could not send the test message.`, diagnostic: result.diagnostic ?? { stage: 'provider response', detail: result.message ?? 'No further details were available.' } };
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
  return { providerType, ...smtp, port: Number(smtp.port), secure: smtp.secure === 'true' };
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
  border-color: var(--dd-color-success);
  background: var(--dd-color-success-soft);
  color: var(--dd-color-success);
}

.notice--warning {
  border-color: var(--dd-color-warning);
  background: var(--dd-color-warning-soft);
  color: var(--dd-color-warning);
}

.notice__diagnostic {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--dd-space-1) var(--dd-space-3);
  margin: var(--dd-space-2) 0 0;
  font-size: var(--dd-font-size-sm);
}

.notice__diagnostic dt {
  font-weight: var(--dd-font-weight-semibold);
}

.notice__diagnostic dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.intake-detail {
  display: grid;
  gap: var(--dd-space-1);
  min-width: 0;
}

.intake-detail code {
  display: block;
  overflow-wrap: anywhere;
  padding: var(--dd-space-2);
  border: var(--dd-border-width) solid var(--dd-color-border);
  border-radius: var(--dd-radius-md);
}

.intake-steps {
  display: grid;
  gap: var(--dd-space-2);
  margin: 0;
  padding-left: var(--dd-space-5);
}
</style>
