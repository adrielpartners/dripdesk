<template>
  <div class="page-stack">
    <header class="page-header">
      <p class="page-header__eyebrow">Campaigns</p>
      <h1 class="page-header__title">{{ campaign?.name ?? 'Campaign setup' }}</h1>
      <p class="page-header__description">Build a linear sequence of short lessons for direct delivery.</p>
    </header>

    <AppEmptyState v-if="error" title="Campaign error" :description="error" />

    <template v-if="campaign">
      <AppCard title="Campaign setup">
        <form class="person-form" @submit.prevent="saveCampaign">
          <AppInput v-model="campaignForm.name" label="Name" />
          <AppInput v-model="campaignForm.description" label="Description" />
          <AppSelect v-model="campaignForm.scheduleType" label="Schedule" :options="scheduleOptions" />
          <AppInput v-model="campaignForm.sendTime" label="Send time" placeholder="09:00" />
          <AppInput
            v-if="campaignForm.scheduleType === 'custom_interval'"
            v-model="campaignForm.intervalDays"
            label="Interval days"
            type="number"
          />
          <AppInput
            v-if="campaignForm.scheduleType === 'custom_days_of_week'"
            v-model="campaignForm.daysOfWeek"
            label="Days of week"
            placeholder="1,3,5"
          />
          <AppSelect v-model="campaignForm.progressRule" label="Progress rule" :options="progressOptions" />
          <AppSelect v-model="campaignForm.mode" label="Mode" :options="modeOptions" />
          <fieldset class="channel-fieldset">
            <legend>Default channels</legend>
            <label v-for="channel in channelOptions" :key="channel.value" class="person-checkbox">
              <input v-model="campaignForm.defaultChannels" type="checkbox" :value="channel.value" />
              {{ channel.label }}
            </label>
          </fieldset>
          <div class="person-actions">
            <AppButton type="submit" :disabled="pending">Save campaign</AppButton>
            <AppButton type="button" variant="secondary" :disabled="pending" @click="activateCampaign">
              Activate
            </AppButton>
            <AppButton type="button" variant="danger" :disabled="pending" @click="archiveCampaign">
              Archive
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard title="Add step">
        <form class="step-form" @submit.prevent="saveAndClose">
          <AppInput v-model="stepForm.title" label="Step title" placeholder="Lesson 1" />
          <AppTextarea v-model="stepForm.defaultContent" label="Default content" placeholder="Shared lesson content" />
          <AppTextarea v-model="stepForm.smsContent" label="SMS variant" />
          <AppTextarea v-model="stepForm.telegramContent" label="Telegram variant" />
          <AppInput v-model="stepForm.emailSubject" label="Email subject" />
          <AppTextarea v-model="stepForm.emailBody" label="Email body" />
          <AppInput v-model="stepForm.delayDaysOverride" label="Delay override in days" type="number" />
          <fieldset class="channel-fieldset">
            <legend>Channel override</legend>
            <label v-for="channel in channelOptions" :key="channel.value" class="person-checkbox">
              <input v-model="stepForm.channelOverrides" type="checkbox" :value="channel.value" />
              {{ channel.label }}
            </label>
          </fieldset>
          <AppInput
            v-if="campaignForm.mode === 'advanced' || campaignForm.progressRule === 'reply_required'"
            v-model="replyPhrases"
            label="Reply phrases"
            placeholder="done, complete"
          />
          <div class="person-actions">
            <AppButton type="button" :disabled="pending" @click="saveAndAddAnother">Save & add another</AppButton>
            <AppButton type="submit" variant="secondary" :disabled="pending">Save & close</AppButton>
            <AppButton type="button" variant="ghost" :disabled="pending" @click="saveDraft">Save draft</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard title="Steps">
        <AppEmptyState
          v-if="steps.length === 0"
          title="No steps yet"
          description="Add the first lesson above. Campaigns stay linear in v1."
        />
        <div v-else class="step-list">
          <article v-for="(step, index) in steps" :key="step.id" class="step-item">
            <div>
              <p class="page-header__eyebrow">Step {{ step.stepOrder }}</p>
              <h2 class="step-item__title">{{ step.title }}</h2>
              <p class="page-header__description">{{ step.defaultContent || step.smsContent || step.telegramContent || step.emailSubject || 'Draft step' }}</p>
            </div>
            <div class="person-actions">
              <AppBadge :tone="step.status === 'published' ? 'success' : 'neutral'">{{ step.status }}</AppBadge>
              <AppButton type="button" size="sm" variant="ghost" :disabled="index === 0" @click="moveStep(index, -1)">Up</AppButton>
              <AppButton type="button" size="sm" variant="ghost" :disabled="index === steps.length - 1" @click="moveStep(index, 1)">Down</AppButton>
              <AppButton type="button" size="sm" variant="secondary" @click="publishStep(step)">Publish</AppButton>
            </div>
          </article>
        </div>
      </AppCard>

      <AppCard title="Enrollments">
        <div class="usage-meter">
          <p class="page-header__description">
            Active contacts: {{ usage?.activeContacts ?? 0 }} / {{ usage?.activeContactLimit ?? 10 }}
          </p>
        </div>

        <form class="campaign-form" @submit.prevent="enrollSelectedPerson">
          <AppSelect v-model="selectedPersonId" label="Add person" :options="personOptions" />
          <AppButton type="submit" :disabled="pending || !selectedPersonId">Add person to campaign</AppButton>
        </form>

        <AppEmptyState
          v-if="enrollments.length === 0"
          title="No enrollments yet"
          description="Enroll a person once this campaign is active."
        />
        <AppTable v-else label="Campaign enrollments">
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th>Current step</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enrollment in enrollments" :key="enrollment.id">
              <td>{{ enrollment.person.displayName }}</td>
              <td><AppBadge :tone="enrollment.status === 'active' ? 'success' : 'neutral'">{{ enrollment.status }}</AppBadge></td>
              <td>Step {{ enrollment.currentStepOrder }}</td>
              <td>
                <div class="person-actions">
                  <AppButton type="button" size="sm" variant="ghost" :disabled="enrollment.status !== 'active'" @click="pauseEnrollment(enrollment.id)">
                    Pause
                  </AppButton>
                  <AppButton type="button" size="sm" variant="danger" :disabled="enrollment.status === 'removed'" @click="removeEnrollment(enrollment.id)">
                    Remove
                  </AppButton>
                </div>
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
import type {
  Campaign,
  CampaignChannel,
  CampaignMode,
  CampaignProgressRule,
  CampaignScheduleType,
  CampaignStep,
} from '~/types/campaigns';
import type { PaginatedPersons } from '~/types/persons';
import type { ActiveContactUsage, Enrollment, PaginatedEnrollments } from '~/types/enrollments';
import { apiRequest } from '~/services/api-client';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const campaignId = String(route.params.id);
const campaign = ref<Campaign | null>(null);
const steps = ref<CampaignStep[]>([]);
const enrollments = ref<Enrollment[]>([]);
const usage = ref<ActiveContactUsage | null>(null);
const personOptions = ref<Array<{ label: string; value: string }>>([]);
const selectedPersonId = ref('');
const pending = ref(false);
const error = ref<string | null>(null);
const replyPhrases = ref('');

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

const campaignForm = reactive({
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
const stepForm = reactive({
  title: '',
  defaultContent: '',
  smsContent: '',
  telegramContent: '',
  emailSubject: '',
  emailBody: '',
  delayDaysOverride: '',
  channelOverrides: [] as CampaignChannel[],
});

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  await Promise.all([loadCampaign(), loadEnrollments(), loadPeople(), loadUsage()]);
}

async function loadCampaign() {
  pending.value = true;
  error.value = null;

  try {
    const response = await apiRequest<Campaign>(`/campaigns/${campaignId}`);
    campaign.value = response;
    steps.value = response.steps ?? [];
    campaignForm.name = response.name;
    campaignForm.description = response.description ?? '';
    campaignForm.scheduleType = response.scheduleType;
    campaignForm.sendTime = response.scheduleConfig?.sendTime ?? '09:00';
    campaignForm.intervalDays = String(response.scheduleConfig?.intervalDays ?? 1);
    campaignForm.daysOfWeek = response.scheduleConfig?.daysOfWeek?.join(',') ?? '1,3,5';
    campaignForm.progressRule = response.progressRule;
    campaignForm.mode = response.mode;
    campaignForm.defaultChannels = [...response.defaultChannels];
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Campaign could not be loaded';
  } finally {
    pending.value = false;
  }
}

async function loadEnrollments() {
  try {
    const response = await apiRequest<PaginatedEnrollments>(`/campaigns/${campaignId}/enrollments?page=1&limit=50`);
    enrollments.value = response.data;
  } catch {
    enrollments.value = [];
  }
}

async function loadPeople() {
  try {
    const response = await apiRequest<PaginatedPersons>('/persons?page=1&limit=100');
    personOptions.value = response.data.map((person) => ({ label: person.displayName, value: person.id }));
  } catch {
    personOptions.value = [];
  }
}

async function loadUsage() {
  try {
    usage.value = await apiRequest<ActiveContactUsage>('/enrollments/usage');
  } catch {
    usage.value = null;
  }
}

async function saveCampaign() {
  await mutate(() =>
    apiRequest<Campaign>(`/campaigns/${campaignId}`, {
      method: 'PATCH',
      body: {
        name: campaignForm.name,
        description: campaignForm.description || undefined,
        scheduleType: campaignForm.scheduleType,
        scheduleConfig: scheduleConfigPayload(),
        progressRule: campaignForm.progressRule,
        mode: campaignForm.mode,
        defaultChannels: campaignForm.defaultChannels,
      },
    }),
  );
}

async function activateCampaign() {
  await mutate(() => apiRequest<Campaign>(`/campaigns/${campaignId}/activate`, { method: 'POST' }));
}

async function archiveCampaign() {
  await mutate(() => apiRequest<Campaign>(`/campaigns/${campaignId}`, { method: 'DELETE' }));
  await navigateTo('/admin/campaigns');
}

async function saveAndAddAnother() {
  await saveStep('draft');
  resetStepForm();
}

async function saveAndClose() {
  await saveStep('published');
  resetStepForm();
}

async function saveDraft() {
  await saveStep('draft');
}

async function enrollSelectedPerson() {
  if (!selectedPersonId.value) return;
  await mutateEnrollment(() =>
    apiRequest<Enrollment>(`/campaigns/${campaignId}/enrollments`, {
      method: 'POST',
      body: { personId: selectedPersonId.value },
    }),
  );
  selectedPersonId.value = '';
}

async function pauseEnrollment(enrollmentId: string) {
  await mutateEnrollment(() => apiRequest<Enrollment>(`/enrollments/${enrollmentId}/pause`, { method: 'POST' }));
}

async function removeEnrollment(enrollmentId: string) {
  await mutateEnrollment(() => apiRequest<Enrollment>(`/enrollments/${enrollmentId}`, { method: 'DELETE' }));
}

async function saveStep(status: 'draft' | 'published') {
  await mutate(() =>
    apiRequest<CampaignStep>(`/campaigns/${campaignId}/steps`, {
      method: 'POST',
      body: stepPayload(status),
    }),
  );
}

async function publishStep(step: CampaignStep) {
  await mutate(() =>
    apiRequest<CampaignStep>(`/steps/${step.id}`, {
      method: 'PATCH',
      body: {
        title: step.title,
        defaultContent: step.defaultContent,
        smsContent: step.smsContent,
        telegramContent: step.telegramContent,
        emailSubject: step.emailSubject,
        emailBody: step.emailBody,
        delayDaysOverride: step.delayDaysOverride,
        channelOverrides: step.channelOverrides,
        replyRequiredPhrases: step.replyRequiredPhrases,
        status: 'published',
      },
    }),
  );
}

async function moveStep(index: number, direction: -1 | 1) {
  const nextSteps = [...steps.value];
  const targetIndex = index + direction;
  const moving = nextSteps[index];
  nextSteps[index] = nextSteps[targetIndex];
  nextSteps[targetIndex] = moving;

  await mutate(() =>
    apiRequest<CampaignStep[]>(`/campaigns/${campaignId}/steps/reorder`, {
      method: 'POST',
      body: { stepIds: nextSteps.map((step) => step.id) },
    }),
  );
}

async function mutate(action: () => Promise<unknown>) {
  pending.value = true;
  error.value = null;

  try {
    await action();
    await loadCampaign();
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Campaign could not be updated';
  } finally {
    pending.value = false;
  }
}

async function mutateEnrollment(action: () => Promise<unknown>) {
  pending.value = true;
  error.value = null;

  try {
    await action();
    await Promise.all([loadEnrollments(), loadUsage()]);
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Enrollment could not be updated';
  } finally {
    pending.value = false;
  }
}

function stepPayload(status: 'draft' | 'published') {
  return {
    title: stepForm.title,
    defaultContent: stepForm.defaultContent || undefined,
    smsContent: stepForm.smsContent || undefined,
    telegramContent: stepForm.telegramContent || undefined,
    emailSubject: stepForm.emailSubject || undefined,
    emailBody: stepForm.emailBody || undefined,
    delayDaysOverride: stepForm.delayDaysOverride ? Number(stepForm.delayDaysOverride) : undefined,
    channelOverrides: stepForm.channelOverrides,
    replyRequiredPhrases: replyPhrases.value
      .split(',')
      .map((phrase) => phrase.trim())
      .filter(Boolean),
    status,
  };
}

function scheduleConfigPayload() {
  return {
    sendTime: campaignForm.sendTime || undefined,
    intervalDays: campaignForm.scheduleType === 'custom_interval' ? Number(campaignForm.intervalDays || 1) : undefined,
    daysOfWeek:
      campaignForm.scheduleType === 'custom_days_of_week'
        ? campaignForm.daysOfWeek
            .split(',')
            .map((day) => Number(day.trim()))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : undefined,
  };
}

function resetStepForm() {
  stepForm.title = '';
  stepForm.defaultContent = '';
  stepForm.smsContent = '';
  stepForm.telegramContent = '';
  stepForm.emailSubject = '';
  stepForm.emailBody = '';
  stepForm.delayDaysOverride = '';
  stepForm.channelOverrides = [];
  replyPhrases.value = '';
}
</script>
