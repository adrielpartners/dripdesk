import assert from 'node:assert/strict';
import net from 'node:net';
import { ProviderCredentialStore } from '@dripdesk/database';
import { sendProviderTest } from './provider-send';

const originalGetConfig = ProviderCredentialStore.prototype.getConfig;
const originalMarkTested = ProviderCredentialStore.prototype.markTested;
const originalFetch = globalThis.fetch;
const requests: Array<{ url: string; body: string }> = [];
const marks: Array<{ providerType: string; ok: boolean }> = [];
let smtpPort = 0;
let smtpRecipient = '';

ProviderCredentialStore.prototype.getConfig = async (_organizationId, providerType) => {
  if (providerType === 'twilio') return { accountSid: 'test-sid', authToken: 'test-token', fromNumber: '+15551234567' } as never;
  if (providerType === 'smtp') return { host: '127.0.0.1', port: smtpPort, fromEmail: 'sender@example.com', secure: false } as never;
  return { botToken: 'test-bot-token' } as never;
};
ProviderCredentialStore.prototype.markTested = async (_organizationId, providerType, ok) => {
  marks.push({ providerType, ok });
  return {} as never;
};
globalThis.fetch = async (input, init) => {
  requests.push({ url: String(input), body: String(init?.body) });
  if (String(input).includes('telegram')) {
    return { ok: false, json: async () => ({ ok: false, description: 'Unauthorized' }) } as Response;
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
  assert.deepEqual(marks[0], { providerType: 'twilio', ok: true });

  await assert.rejects(
    sendProviderTest({ organizationId: 'organization-1', providerType: 'telegram', recipient: '123456789' }),
    /Provider credentials were rejected/,
  );
  assert.equal(JSON.parse(requests[1]?.body ?? '{}').chat_id, '123456789');
  assert.deepEqual(marks[1], { providerType: 'telegram', ok: false });

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
          socket.write('250 recipient accepted\r\n');
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
    assert.deepEqual(marks[2], { providerType: 'smtp', ok: true });
  } finally {
    server.close();
  }
  console.log('provider-send tests passed');
}
