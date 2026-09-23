import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { formatProviderDiagnostic, parseProviderTestFailure, ProviderCredentialStore, sanitizeProviderDetail, validateProviderConfig } from './provider-credentials';

assert.equal(
  sanitizeProviderDetail('Rejected user@example.com +15551234567 secret-value-1234', ['secret-value-1234']),
  'Rejected [email redacted] [phone redacted] [redacted]',
);
assert.equal(
  formatProviderDiagnostic({ provider: 'smtp', stage: 'AUTH LOGIN', code: 'SMTP_535', providerCode: '5.7.8', detail: 'Invalid credentials' }),
  'SMTP AUTH LOGIN failed (SMTP_535, 5.7.8): Invalid credentials',
);
assert.equal(parseProviderTestFailure('some raw provider error'), null);
assert.deepEqual(parseProviderTestFailure(JSON.stringify({
  tag: 'dripdesk-provider-test',
  diagnostic: { provider: 'twilio', stage: 'send message', httpStatus: 400, providerCode: '21608', detail: 'To +15551234567 was not verified' },
})), {
  provider: 'twilio', stage: 'send message', code: undefined, providerCode: '21608',
  httpStatus: 400, detail: 'To [phone redacted] was not verified',
});

console.log('provider-credentials diagnostic tests passed');
assert.equal(validateProviderConfig('telegram', { botToken: 'bot-token' }).ok, false);
assert.equal(validateProviderConfig('telegram', { botToken: 'bot-token', webhookSecret: 'secret' }).ok, true);

test('ambiguous Twilio SID and number never resolve to an arbitrary tenant', async () => {
  let encryptedConfig = '';
  let credentials: Array<{ organizationId: string; encryptedConfig: string }> = [];
  const client = {
    providerCredential: {
      upsert: async (query: { create: { encryptedConfig: string } }) => {
        encryptedConfig = query.create.encryptedConfig;
        return { id: 'credential-1' };
      },
      findMany: async () => credentials,
    },
  } as unknown as PrismaClient;
  const store = new ProviderCredentialStore(client, 'test-encryption-key');
  await store.upsert('org-1', 'twilio', { accountSid: 'AC123', authToken: 'token', fromNumber: '+15551234567' });
  credentials = [{ organizationId: 'org-1', encryptedConfig }];
  assert.equal((await store.findTwilioWebhookCredential('AC123', '+15551234567'))?.organizationId, 'org-1');
  credentials.push({ organizationId: 'org-2', encryptedConfig });
  assert.equal(await store.findTwilioWebhookCredential('AC123', '+15551234567'), null);
});
