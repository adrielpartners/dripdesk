import assert from 'assert';
import { BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsRepository } from './campaigns.repository';
import type { TenantContext } from '../../common/tenant/tenant-context';
import type { CreateCampaignDto } from './dto/create-campaign.dto';

// Mock repository — just the methods we need
class MockRepo {
  findManyForTenant(_tenant: TenantContext, page: number, limit: number) {
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
  createForTenant(_tenant: TenantContext, dto: CreateCampaignDto) {
    return Promise.resolve({ id: 'new-id', ...dto, status: 'draft' });
  }
}

const repo = new MockRepo() as unknown as CampaignsRepository;
const service = new CampaignsService(repo);
const tenant = { organizationId: 'org-1', userId: 'user-1', membershipRole: 'owner' } as TenantContext;

async function run() {
  // --- findAll pagination clamping ---
  const result1 = await service.findAll(tenant, 1, 20);
  assert.strictEqual(result1.page, 1);
  assert.strictEqual(result1.limit, 20);

  const result2 = await service.findAll(tenant, 0, 0);
  assert.strictEqual(result2.page, 1, 'page 0 clamped to 1');

  const result3 = await service.findAll(tenant, 999, 999);
  assert.strictEqual(result3.limit, 100, 'limit 999 clamped to 100');

  // --- create validates channels ---
  try {
    await service.create(
      tenant,
      { name: 'Test', defaultChannels: [] },
    );
    assert.fail('should have thrown for empty channels');
  } catch (err: unknown) {
    assert(err instanceof BadRequestException, 'empty channels throws BadRequestException');
    assert(err.message.includes('At least one'), 'empty channels message');
  }

  // --- create with valid data ---
  const created = await service.create(
    tenant,
    { name: '  My Campaign  ', defaultChannels: ['sms'] },
  );
  assert.strictEqual(created.name, 'My Campaign', 'name is trimmed');

  console.log('campaigns service tests passed');
}

run().catch((err) => {
  console.error('campaigns tests failed:', err);
  process.exit(1);
});
