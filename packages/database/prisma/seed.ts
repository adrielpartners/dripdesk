import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      price: 0,
      activeContactsLimit: 10,
      campaignsLimit: 1,
      isLifetime: false,
      features: { channels: ['EMAIL'], analytics: 'basic' },
    },
    {
      name: 'core',
      displayName: 'Core',
      price: 29,
      activeContactsLimit: 250,
      campaignsLimit: 5,
      isLifetime: false,
      features: { channels: ['EMAIL', 'SMS'], analytics: 'standard' },
    },
    {
      name: 'plus',
      displayName: 'Plus',
      price: 79,
      activeContactsLimit: 1000,
      campaignsLimit: 20,
      isLifetime: false,
      features: { channels: ['EMAIL', 'SMS', 'TELEGRAM', 'WHATSAPP'], analytics: 'advanced' },
    },
    {
      name: 'pro',
      displayName: 'Pro',
      price: 199,
      activeContactsLimit: 5000,
      campaignsLimit: null,
      isLifetime: false,
      features: { channels: ['EMAIL', 'SMS', 'TELEGRAM', 'WHATSAPP'], analytics: 'advanced', api: true },
    },
    {
      name: 'lifetime_core',
      displayName: 'Lifetime Core',
      price: 290,
      activeContactsLimit: 250,
      campaignsLimit: 5,
      isLifetime: true,
      features: { channels: ['EMAIL', 'SMS'], analytics: 'standard' },
    },
    {
      name: 'lifetime_plus',
      displayName: 'Lifetime Plus',
      price: 790,
      activeContactsLimit: 1000,
      campaignsLimit: 20,
      isLifetime: true,
      features: { channels: ['EMAIL', 'SMS', 'TELEGRAM', 'WHATSAPP'], analytics: 'advanced' },
    },
  ];

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }

  console.log('Seeded billing plans');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
