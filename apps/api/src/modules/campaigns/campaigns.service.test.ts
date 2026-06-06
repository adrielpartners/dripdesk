import assert from 'assert';
import { BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsRepository } from './campaigns.repository';

// Mock repository — just the methods we need
class MockRepo {
  findManyForTenant(_tenant: any, page: number, limit: number) {
    return Promise.resolve({
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    });
  }
  findByIdForTenant() {
    return Promise.resolve(null);
  }
  createForTenant(_tenant: any, dto: any) {
    return Promise.resolve({ id: 'new-id', ...dto, status: 'draft' });
  }
}

const repo = new MockRepo() as unknown as CampaignsRepository;
const service = new CampaignsService(repo);

async function run() {
  // --- findAll pagination clamping ---
  const result1 = await service.findAll({ organizationId: 'org-1' } as any, 1, 20);
  assert.strictEqual(result1.page, 1);
  assert.strictEqual(result1.limit, 20);

  const result2 = await service.findAll({ organizationId: 'org-1' } as any, 0, 0);
  assert.strictEqual(result2.page, 1, 'page 0 clamped to 1');

  const result3 = await service.findAll({ organizationId: 'org-1' } as any, 999, 999);
  assert.strictEqual(result3.limit, 100, 'limit 999 clamped to 100');

  // --- create validates channels ---
  try {
    await service.create(
      { organizationId: 'org-1' } as any,
      { name: 'Test', defaultChannels: [] } as any,
    );
    assert.fail('should have thrown for empty channels');
  } catch (err: any) {
    assert(err instanceof BadRequestException, 'empty channels throws BadRequestException');
    assert((err.message as string).includes('At least one'), 'empty channels message');
  }

  // --- create with valid data ---
  const created: any = await service.create(
    { organizationId: 'org-1' } as any,
    { name: '  My Campaign  ', defaultChannels: ['sms'] } as any,
  );
  assert.strictEqual(created.name, 'My Campaign', 'name is trimmed');

  console.log('campaigns service tests passed');
}

run().catch((err) => {
  console.error('campaigns tests failed:', err);
  process.exit(1);
});