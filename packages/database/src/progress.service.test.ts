import assert from 'node:assert/strict';
import { ProgressService, normalizeReplyText, replyMatchesRequiredPhrases, replyTextFromMetadata } from './progress.service';
import { maskProviderConfig, validateProviderConfig } from './provider-credentials';
import { createUnsubscribeToken, hashUnsubscribeToken } from './unsubscribe';

assert.equal(normalizeReplyText('  YES, I am READY!!!  '), 'yes i am ready');
assert.equal(normalizeReplyText('Ready\t\tto   start.'), 'ready to start');

assert.equal(replyMatchesRequiredPhrases('Yes, I am ready!', ['READY']), true);
assert.equal(replyMatchesRequiredPhrases('I can start now.', ['start now']), true);
assert.equal(replyMatchesRequiredPhrases('I can start later.', ['start now']), false);
assert.equal(replyMatchesRequiredPhrases('Any content', ['   ']), false);

assert.equal(replyTextFromMetadata({ text: 'hello' }), 'hello');
assert.equal(replyTextFromMetadata({ replyText: 'reply' }), 'reply');
assert.equal(replyTextFromMetadata({ body: 'body' }), 'body');
assert.equal(replyTextFromMetadata({ message: 'message' }), 'message');
assert.equal(replyTextFromMetadata({ text: 123 }), '');
assert.equal(replyTextFromMetadata(null), '');
assert.deepEqual(
  maskProviderConfig('twilio', { accountSid: 'AC1234567890', authToken: 'secret-token', fromNumber: '+15551234567' }),
  { accountSid: 'AC12...7890', authToken: '********', fromNumber: '+15551234567' },
);
assert.equal(validateProviderConfig('telegram', { botToken: '' }).ok, false);
assert.equal(
  validateProviderConfig('smtp', { host: 'smtp.example.com', port: 587, fromEmail: 'hello@example.com' }).ok,
  true,
);
const unsubscribeToken = createUnsubscribeToken();
assert.equal(unsubscribeToken.length > 20, true);
assert.notEqual(hashUnsubscribeToken(unsubscribeToken), unsubscribeToken);
assert.equal(hashUnsubscribeToken(unsubscribeToken), hashUnsubscribeToken(unsubscribeToken));

void runServiceTests().then(() => {
  console.log('progress-service tests passed');
});

async function runServiceTests() {
  const timeBased = enrollmentFixture({
    progressRule: 'time_based',
    currentStatus: 'queued',
    steps: [{ id: 'step-1', stepOrder: 1, replyRequiredPhrases: [] }],
  });
  const timeResult = await new ProgressService(fakeClient(timeBased) as never).evaluateEnrollment('enrollment-1');
  assert.equal(timeResult.completedStep, true);
  assert.equal(timeResult.completedCampaign, true);
  assert.equal(timeBased.status, 'completed');
  assert.equal(timeBased.stepStates[0]?.status, 'completed');

  const clickRequired = enrollmentFixture({
    progressRule: 'link_click_required',
    clickedAt: new Date('2026-05-28T12:00:00Z'),
    steps: [
      { id: 'step-1', stepOrder: 1, replyRequiredPhrases: [] },
      { id: 'step-2', stepOrder: 2, replyRequiredPhrases: [] },
    ],
  });
  const clickResult = await new ProgressService(fakeClient(clickRequired) as never).evaluateEnrollment('enrollment-1');
  assert.equal(clickResult.completedStep, true);
  assert.equal(clickResult.completedCampaign, false);
  assert.equal(clickRequired.currentStepOrder, 2);

  const replyRequired = enrollmentFixture({
    progressRule: 'reply_required',
    steps: [{ id: 'step-1', stepOrder: 1, replyRequiredPhrases: ['YES READY'] }],
  });
  const replyClient = fakeClient(replyRequired, [{ metadata: { text: 'Yes, ready!' } }]);
  const replyResult = await new ProgressService(replyClient as never).evaluateEnrollment('enrollment-1');
  assert.equal(replyResult.completedStep, true);
  assert.equal(replyResult.reason, 'reply_phrase_matched');

  const anyReply = enrollmentFixture({
    progressRule: 'reply_required',
    steps: [{ id: 'step-1', stepOrder: 1, replyRequiredPhrases: [] }],
  });
  const anyReplyResult = await new ProgressService(fakeClient(anyReply, [{ metadata: { text: 'Got it' } }]) as never).evaluateEnrollment(
    'enrollment-1',
  );
  assert.equal(anyReplyResult.completedStep, true);
  assert.equal(anyReplyResult.reason, 'any_reply_received');
}

function enrollmentFixture(input: {
  progressRule: 'time_based' | 'link_click_required' | 'reply_required';
  currentStatus?: string;
  clickedAt?: Date | null;
  steps: Array<{ id: string; stepOrder: number; replyRequiredPhrases: string[] }>;
}) {
  return {
    id: 'enrollment-1',
    organizationId: 'organization-1',
    status: 'active',
    currentStepOrder: 1,
    completedAt: null as Date | null,
    campaign: {
      progressRule: input.progressRule,
      steps: input.steps.map((step) => ({
        ...step,
        status: 'published',
      })),
    },
    stepStates: input.steps.map((step) => ({
      id: `state-${step.stepOrder}`,
      enrollmentId: 'enrollment-1',
      campaignStepId: step.id,
      stepOrder: step.stepOrder,
      status: step.stepOrder === 1 ? input.currentStatus ?? 'pending' : 'pending',
      clickedAt: step.stepOrder === 1 ? input.clickedAt ?? null : null,
      repliedAt: null,
      completedAt: null as Date | null,
    })),
  };
}

function fakeClient(enrollment: ReturnType<typeof enrollmentFixture>, replies: Array<{ metadata: unknown }> = []) {
  const client: {
    enrollment: {
      findUnique: () => Promise<typeof enrollment>;
      update: (input: { data: Record<string, unknown> }) => Promise<typeof enrollment>;
    };
    enrollmentStepState: {
      updateMany: (input: { where: { id: string }; data: Record<string, unknown> }) => Promise<{ count: number }>;
    };
    messageEvent: {
      findFirst: () => Promise<null>;
      findMany: () => Promise<Array<{ metadata: unknown }>>;
      create: () => Promise<Record<string, never>>;
    };
    $transaction: <T>(callback: (tx: typeof client) => Promise<T>) => Promise<T>;
  } = {
    enrollment: {
      findUnique: async () => enrollment,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(enrollment, data);
        return enrollment;
      },
    },
    enrollmentStepState: {
      updateMany: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const state = enrollment.stepStates.find((item) => item.id === where.id);
        if (!state || state.status === 'completed') return { count: 0 };
        Object.assign(state, data);
        return { count: 1 };
      },
    },
    messageEvent: {
      findFirst: async () => null,
      findMany: async () => replies,
      create: async () => ({}),
    },
    $transaction: async (callback) => callback(client),
  };

  return client;
}
