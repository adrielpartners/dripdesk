import assert from 'node:assert/strict';
import { formatProviderDiagnostic, parseProviderTestFailure, sanitizeProviderDetail } from './provider-credentials';

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
