import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { CampaignsRepository } from './campaigns.repository';
import type { TenantContext } from '../../common/tenant/tenant-context';

const tenant = { organizationId: 'org-1', userId: 'user-1', membershipRole: 'owner' } as TenantContext;

async function run() {
  let calls = 0;
  let lookedUpId = '';
  const prisma = {
    campaign: {
      findFirst: async ({ where }: { where: { id: string } }) => {
        lookedUpId = where.id;
        return { id: 'A1B2C3' };
      },
      create: async () => {
        calls++;
        if (calls === 1) {
          throw new Prisma.PrismaClientKnownRequestError('Duplicate code', {
            code: 'P2002', clientVersion: '5.22.0', meta: { target: ['id'] },
          });
        }
        return { id: 'A1B2C3' };
      },
    },
  };
  const repository = new CampaignsRepository(prisma as never);
  const created = await repository.createForTenant(tenant, { name: 'Test campaign' });
  assert.equal(created.id, 'A1B2C3');
  assert.equal(calls, 2, 'campaign ID collisions are retried');
  await repository.findByIdForTenant(tenant, 'a1b2c3');
  assert.equal(lookedUpId, 'A1B2C3', 'lowercase campaign IDs are normalized for lookups');
}

void run().then(() => console.log('campaign ID tests passed'));
