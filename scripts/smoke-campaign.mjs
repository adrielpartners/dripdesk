import assert from 'node:assert/strict';

const apiUrl = process.env.DRIPDESK_SMOKE_API_URL ?? 'http://localhost:3000/api';
const mailpitUrl = process.env.DRIPDESK_SMOKE_MAILPIT_URL ?? 'http://localhost:8025';

for (const value of [apiUrl, mailpitUrl]) {
  const host = new URL(value).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error('The campaign smoke test only runs against local services');
  }
}

const marker = `smoke-${Date.now()}`;
const email = `${marker}@example.test`;
const password = `LocalSmoke-${marker}!`;

async function api(path, method = 'GET', body, token) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`);
  }
  return payload.data;
}

async function waitFor(check, timeoutMs = 150_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error('Timed out waiting for both campaign steps to send and complete');
}

await api('/health');
const session = await api('/auth/register', 'POST', {
  email,
  password,
  organizationName: `Smoke ${marker}`,
});
const token = session.accessToken;
assert.ok(token, 'registration returns an access token');

await api('/provider-credentials/smtp', 'PUT', {
  providerType: 'smtp',
  host: 'mailpit',
  port: 1025,
  fromEmail: 'lessons@dripdesk.test',
  fromName: 'DripDesk Smoke',
  secure: false,
  preset: 'generic',
}, token);

const campaign = await api('/campaigns', 'POST', {
  name: `Smoke campaign ${marker}`,
  scheduleType: 'daily',
  scheduleConfig: { sendTime: '00:00' },
  progressRule: 'time_based',
  defaultChannels: ['email'],
}, token);

for (const stepNumber of [1, 2]) {
  await api(`/campaigns/${campaign.id}/steps`, 'POST', {
    title: `Smoke lesson ${stepNumber}`,
    status: 'published',
    emailSubject: `${marker} lesson ${stepNumber}`,
    emailBody: `<p>Lesson ${stepNumber} for {{person.name}}. Read https://example.com/lesson-${stepNumber}.</p>`,
    delayDaysOverride: 0,
  }, token);
}

await api(`/campaigns/${campaign.id}/activate`, 'POST', undefined, token);
const person = await api('/persons', 'POST', {
  displayName: 'Smoke Recipient',
  channels: [{ channelType: 'email', address: email }],
}, token);
const enrollment = await api(`/campaigns/${campaign.id}/enrollments`, 'POST', { personId: person.id }, token);

const result = await waitFor(async () => {
  const [mailResponse, enrollments] = await Promise.all([
    fetch(`${mailpitUrl}/api/v1/messages`).then((response) => response.json()),
    api(`/persons/${person.id}/enrollments`, 'GET', undefined, token),
  ]);
  const messages = mailResponse.messages.filter((message) => message.Subject?.includes(marker));
  const current = enrollments.data.find((item) => item.id === enrollment.id);
  if (messages.length < 2 || current?.status !== 'completed') return null;
  return { messages, current };
});

assert.equal(result.messages.length, 2, 'each step sends exactly one email');
assert.deepEqual(
  result.messages.map((message) => message.Subject).sort(),
  [`${marker} lesson 1`, `${marker} lesson 2`],
);
assert.equal(result.current.stepStates.filter((state) => state.status === 'completed').length, 2);

const delivered = await Promise.all(result.messages.map(async (message) => {
  const response = await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`);
  assert.equal(response.ok, true, 'Mailpit returns the delivered message');
  return response.json();
}));
for (const message of delivered) {
  assert.match(message.HTML, /Lesson [12] for Smoke Recipient/, 'recipient tags are merged');
  assert.ok(message.HTML.includes(`${new URL(apiUrl).origin}/api/l/`), 'tracked links use the public API URL');
  assert.match(message.HTML, /http:\/\/localhost:3001\/unsubscribe\//, 'unsubscribe link is present');
  assert.doesNotMatch(message.HTML, /\/api\/api\//, 'API path is not duplicated');
}

console.log(JSON.stringify({
  result: 'passed',
  campaignId: campaign.id,
  personId: person.id,
  enrollmentId: enrollment.id,
  messages: result.messages.length,
  completedSteps: 2,
}));
