import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { JOB_NAMES } from '@dripdesk/shared';
import { QueueService } from './queue.service';

const queueService = Object.create(QueueService.prototype) as QueueService;
let state = 'completed';
const job = {
  name: JOB_NAMES.TEST_PROVIDER,
  data: { organizationId: 'organization-1', providerType: 'smtp', recipient: 'private@example.com' },
  failedReason: 'Unauthorized',
  getState: async () => state,
};
(queueService as unknown as { queue: { getJob: () => Promise<typeof job> } }).queue = {
  getJob: async () => job,
};

void run();

async function run() {
  assert.deepEqual(await queueService.getProviderTestStatus('organization-1', 'smtp', 'job-1'), { status: 'success' });
  state = 'failed';
  assert.deepEqual(await queueService.getProviderTestStatus('organization-1', 'smtp', 'job-1'), {
    status: 'failure', message: 'Provider credentials were rejected',
  });
  job.failedReason = JSON.stringify({
    tag: 'dripdesk-provider-test',
    diagnostic: { provider: 'smtp', stage: 'AUTH LOGIN', code: 'SMTP_535', providerCode: '5.7.8', detail: 'Authentication rejected' },
  });
  assert.deepEqual(await queueService.getProviderTestStatus('organization-1', 'smtp', 'job-1'), {
    status: 'failure',
    message: 'SMTP AUTH LOGIN failed (SMTP_535, 5.7.8): Authentication rejected',
    diagnostic: { provider: 'smtp', stage: 'AUTH LOGIN', code: 'SMTP_535', providerCode: '5.7.8', httpStatus: undefined, detail: 'Authentication rejected' },
  });
  await assert.rejects(queueService.getProviderTestStatus('organization-2', 'smtp', 'job-1'), NotFoundException);
  await assert.rejects(queueService.getProviderTestStatus('organization-1', 'twilio', 'job-1'), NotFoundException);
  console.log('queue provider-test status tests passed');
}
