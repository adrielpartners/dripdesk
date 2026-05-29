import assert from 'node:assert/strict';
import {
  mergeTags,
  extractUrls,
  rewriteTrackedLinks,
  selectVariant,
  type EnrollmentForMessage,
  type StepForMessage,
} from './message-preparation';

const step: StepForMessage = {
  id: 'step-1',
  title: 'Welcome',
  defaultContent: 'Default body',
  smsContent: 'SMS body',
  telegramContent: null,
  emailSubject: 'Email {{step.title}}',
  emailBody: 'Hi {{person.name}}, start {{campaign.name}} at https://example.com/start.',
};

const enrollment: EnrollmentForMessage = {
  id: 'enrollment-1',
  organizationId: 'organization-1',
  campaignId: 'campaign-1',
  personId: 'person-1',
  person: {
    displayName: 'Ada',
    status: 'active',
    channels: [],
  },
  campaign: {
    id: 'campaign-1',
    name: 'Drip 101',
  },
};

assert.deepEqual(selectVariant(step, 'email'), {
  subject: 'Email {{step.title}}',
  body: 'Hi {{person.name}}, start {{campaign.name}} at https://example.com/start.',
});
assert.deepEqual(selectVariant(step, 'sms'), { body: 'SMS body' });
assert.deepEqual(selectVariant(step, 'telegram'), { body: 'Default body' });

assert.equal(
  mergeTags('Hi {{person.name}}: {{campaign.name}} / {{step.title}}', enrollment, step),
  'Hi Ada: Drip 101 / Welcome',
);
assert.deepEqual(extractUrls('Open https://example.com/start. Then https://example.com/help!'), [
  'https://example.com/start',
  'https://example.com/help',
]);

const createdLinks: Array<{ token: string; originalUrl: string; enrollmentId: string; campaignStepId: string }> = [];
const client = {
  trackedLink: {
    async create({ data }: { data: { token: string; originalUrl: string; enrollmentId: string; campaignStepId: string } }) {
      createdLinks.push(data);
      return data;
    },
  },
};

void run().then(() => {
  console.log('message-preparation tests passed');
});

async function run() {
  const rewritten = await rewriteTrackedLinks({
    body: 'Read https://example.com/start. Then https://example.com/start again.',
    publicApiUrl: 'https://api.dripdesk.test/',
    outboxId: 'outbox-1',
    enrollment,
    step,
    client: client as never,
  });

  assert.equal(createdLinks.length, 1, 'duplicate links are represented by one tracked link record');
  assert.equal(createdLinks[0]?.originalUrl, 'https://example.com/start');
assert.equal(createdLinks[0]?.enrollmentId, enrollment.id);
assert.equal(createdLinks[0]?.campaignStepId, step.id);
assert.equal(rewritten.includes('https://example.com/start'), false, 'original URL is removed from prepared body');
assert.equal((rewritten.match(/https:\/\/api\.dripdesk\.test\/api\/l\//g) ?? []).length, 2);
assert.equal(rewritten.endsWith('again.'), true, 'sentence punctuation is preserved outside tracked URLs');
}
