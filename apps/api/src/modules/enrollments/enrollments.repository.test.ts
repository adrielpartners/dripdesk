import assert from 'assert';
import { EnrollmentsRepository } from './enrollments.repository';

const prisma = {
  enrollment: {
    findMany: async () => [{ personId: 'person-1' }, { personId: 'person-2' }],
  },
  billingSubscription: {
    findUnique: async () => ({
      planId: 'core',
      activeContactLimit: 250,
    }),
  },
};

const repository = new EnrollmentsRepository(prisma as never);

async function run() {
  const usage = await repository.findUsageForTenant({
    organizationId: 'org-1',
    userId: 'user-1',
    membershipRole: 'owner',
  });

  assert.equal(usage.plan, 'core');
  assert.equal(usage.activeContacts, 2);
  assert.equal(usage.activeContactLimit, 250);
  assert.equal(usage.remainingActiveContacts, 248);
  assert.equal(usage.activeContactWindowDays, 30);
}

void run().then(() => {
  console.log('enrollments active-contact tests passed');
});
