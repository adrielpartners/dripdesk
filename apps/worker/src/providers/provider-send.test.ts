import assert from 'node:assert/strict';
import net from 'node:net';
import { ProviderCredentialStore, parseProviderTestFailure, type ProviderDiagnostic } from '@dripdesk/database';
import { sendProviderTest } from './provider-send';

const originalGetConfig = ProviderCredentialStore.prototype.getConfig;
const originalMarkTested = ProviderCredentialStore.prototype.markTested;
const originalFetch = globalThis.fetch;
const requests: Array<{ url: string; body: string }> = [];
const marks: Array<{ providerType: string; ok: boolean; error?: ProviderDiagnostic | string }> = [];
let smtpPort = 0;
let smtpRecipient = '';
let smtpRejectRecipient = false;
let twilioFailure: 'none' | 'http' | 'network' = 'none';

ProviderCredentialStore.prototype.getConfig = async (_organizationId, providerType) => {
  if (providerType === 'twilio') return { accountSid: 'test-sid', authToken: 'test-token', fromNumber: '+15551234567' } as never;
  if (providerType === 'smtp') return { host: '127.0.0.1', port: smtpPort, fromEmail: 'sender@example.com', secure: false } as never;
  return { botToken: 'test-bot-token' } as never;
};
ProviderCredentialStore.prototype.markTested = async (_organizationId, providerType, ok, error) => {
  marks.push({ providerType, ok, error });
  return {} as never;
};
globalThis.fetch = async (input, init) => {
  requests.push({ url: String(input), body: String(init?.body) });
  if (String(input).includes('telegram')) {
    return { ok: false, status: 401, json: async () => ({ ok: false, error_code: 401, description: 'Unauthorized' }) } as Response;
  }
  if (twilioFailure === 'http') {
    return { ok: false, status: 400, json: async () => ({ code: 21608, message: 'To +15557654321 is not verified' }) } as Response;
  }
  if (twilioFailure === 'network') {
    throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'EAI_AGAIN' } });
  }
  return { ok: true, json: async () => ({ sid: 'test-message-id' }) } as Response;
};

void run().finally(() => {
  ProviderCredentialStore.prototype.getConfig = originalGetConfig;
  ProviderCredentialStore.prototype.markTested = originalMarkTested;
  globalThis.fetch = originalFetch;
});

async function run() {
  assert.deepEqual(await sendProviderTest({ organizationId: 'organization-1', providerType: 'twilio', recipient: '+15557654321' }), { sent: true });
  assert.equal(new URLSearchParams(requests[0]?.body).get('To'), '+15557654321');
  assert.deepEqual(marks[0], { providerType: 'twilio', ok: true, error: undefined });

  await assert.rejects(sendProviderTest({ organizationId: 'organization-1', providerType: 'telegram', recipient: '123456789' }),
    (error: Error) => {
      const diagnostic = parseProviderTestFailure(error.message);
      assert.equal(diagnostic?.httpStatus, 401);
      assert.equal(diagnostic?.providerCode, '401');
      assert.equal(diagnostic?.detail, 'Unauthorized');
      return true;
    });
  assert.equal(JSON.parse(requests[1]?.body ?? '{}').chat_id, '123456789');
  assert.equal(marks[1]?.providerType, 'telegram');
  assert.equal(marks[1]?.ok, false);

  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 local SMTP ready\r\n');
    let buffer = '';
    let receivingData = false;
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (receivingData) {
        if (buffer.includes('\r\n.\r\n')) {
          receivingData = false;
          buffer = '';
          socket.write('250 accepted\r\n');
        }
        return;
      }
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('EHLO')) socket.write('250 hello\r\n');
        else if (line.startsWith('MAIL FROM')) socket.write('250 sender accepted\r\n');
        else if (line.startsWith('RCPT TO')) {
          smtpRecipient = line;
          socket.write(smtpRejectRecipient ? '550 5.1.1 Recipient recipient@example.com rejected\r\n' : '250 recipient accepted\r\n');
        } else if (line === 'DATA') {
          receivingData = true;
          socket.write('354 send data\r\n');
        }
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  smtpPort = (server.address() as net.AddressInfo).port;
  try {
    assert.deepEqual(await sendProviderTest({ organizationId: 'organization-1', providerType: 'smtp', recipient: 'recipient@example.com' }), { sent: true });
    assert.equal(smtpRecipient, 'RCPT TO:<recipient@example.com>');
    assert.deepEqual(marks[2], { providerType: 'smtp', ok: true, error: undefined });
    smtpRejectRecipient = true;
    await assert.rejects(sendProviderTest({ organizationId: 'organization-1', providerType: 'smtp', recipient: 'recipient@example.com' }),
      (error: Error) => {
        const diagnostic = parseProviderTestFailure(error.message);
        assert.equal(diagnostic?.code, 'SMTP_550');
        assert.equal(diagnostic?.providerCode, '5.1.1');
        assert.equal(diagnostic?.stage, 'RCPT TO');
        assert.equal(diagnostic?.detail?.includes('recipient@example.com'), false, 'recipient PII is redacted');
        return true;
      });
  } finally {
    server.close();
  }

  twilioFailure = 'http';
  await assert.rejects(sendProviderTest({ organizationId: 'organization-1', providerType: 'twilio', recipient: '+15557654321' }),
    (error: Error) => {
      const diagnostic = parseProviderTestFailure(error.message);
      assert.equal(diagnostic?.httpStatus, 400);
      assert.equal(diagnostic?.providerCode, '21608');
      assert.equal(diagnostic?.detail, 'To [phone redacted] is not verified');
      return true;
    });
  twilioFailure = 'network';
  await assert.rejects(sendProviderTest({ organizationId: 'organization-1', providerType: 'twilio', recipient: '+15557654321' }),
    (error: Error) => {
      const diagnostic = parseProviderTestFailure(error.message);
      assert.equal(diagnostic?.code, 'EAI_AGAIN');
      assert.equal(diagnostic?.stage, 'HTTP connection');
      return true;
    });
  console.log('provider-send tests passed');
}
