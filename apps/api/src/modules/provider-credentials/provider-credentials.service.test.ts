import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import type { TenantContext } from '../../common/tenant/tenant-context';
import { ProviderCredentialsService } from './provider-credentials.service';

const tenant: TenantContext = { organizationId: 'organization-1', userId: 'user-1', membershipRole: 'admin' };
const enqueued: Array<[string, string, string]> = [];
const queue = {
  async enqueueProviderTest(organizationId: string, providerType: string, recipient: string) {
    enqueued.push([organizationId, providerType, recipient]);
    return { jobId: 'job-1', status: 'pending' };
  },
  async getProviderTestStatus(organizationId: string, providerType: string, jobId: string) {
    return { organizationId, providerType, jobId };
  },
};

const service = new ProviderCredentialsService({} as never, queue as never);
(service as unknown as { store: { getConfig: () => Promise<object | null> } }).store = {
  getConfig: async () => ({ accountSid: 'sid', authToken: 'token', fromNumber: '+15551234567' }),
};

void run();

async function run() {
  assert.deepEqual(await service.test(tenant, 'twilio', ' +15557654321 '), { jobId: 'job-1', status: 'pending' });
  assert.deepEqual(enqueued[0], ['organization-1', 'twilio', '+15557654321']);
  await assert.rejects(service.test(tenant, 'twilio', '555-765-4321'), BadRequestException);
  await assert.rejects(service.test(tenant, 'smtp', 'not-an-email'), BadRequestException);
  await assert.rejects(service.test(tenant, 'telegram', '@username'), BadRequestException);
  assert.equal(enqueued.length, 1, 'invalid destinations are never queued');

  (service as unknown as { store: { getConfig: () => Promise<object | null> } }).store = {
    getConfig: async () => null,
  };
  await assert.rejects(service.test(tenant, 'smtp', 'test@example.com'), BadRequestException);
  assert.equal(enqueued.length, 1, 'missing credentials are never queued');

  assert.deepEqual(await service.testStatus(tenant, 'smtp', 'job-1'), {
    organizationId: 'organization-1', providerType: 'smtp', jobId: 'job-1',
  });

  let savedConfig: object | null = null;
  (service as unknown as { store: object }).store = {
    getConfig: async () => ({
      host: 'smtp-relay.brevo.com', port: 587, username: 'saved-user', password: 'saved-secret',
      fromEmail: 'saved@example.com', fromName: 'Saved name', secure: false, preset: 'brevo',
    }),
    upsert: async (_organizationId: string, _providerType: string, config: object) => {
      savedConfig = config;
      return { status: 'configured' };
    },
  };
  await service.upsert(tenant, {
    providerType: 'smtp', host: 'smtp-relay.brevo.com', port: 587, username: '', password: '',
    fromEmail: 'saved@example.com', fromName: 'Saved name', secure: false, preset: 'brevo',
  });
  assert.deepEqual(savedConfig, {
    host: 'smtp-relay.brevo.com', port: 587, username: 'saved-user', password: 'saved-secret',
    fromEmail: 'saved@example.com', fromName: 'Saved name', secure: false, preset: 'brevo',
  }, 'blank secret inputs keep the saved values');
  console.log('provider-credentials service tests passed');
}
