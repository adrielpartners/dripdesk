import assert from 'assert';
import test from 'node:test';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { ProviderCredentialStore } from '@dripdesk/database';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyTwilioSignature, WebhooksService } from './webhooks.service';

const url = 'https://api.example.com/api/webhooks/twilio/reply';
const params = {
  AccountSid: 'AC123',
  Body: 'Yes',
  From: '+15550001111',
  To: '+15550002222',
};

assert.equal(verifyTwilioSignature('MxI8NAsE5QOLAVImRinthDl+Rl0=', url, params, 'auth-token'), true);
assert.equal(verifyTwilioSignature('MxI8NAsE5QOLAVImRinthDl+Rl0=', url, { ...params, Body: 'No' }, 'auth-token'), false);
assert.equal(verifyTwilioSignature(undefined, url, params, 'auth-token'), false);

console.log('webhooks signature tests passed');

test('Telegram replies are rejected when no webhook secret is configured', async () => {
  const originalGetConfig = ProviderCredentialStore.prototype.getConfig;
  let lookedUpPerson = false;
  ProviderCredentialStore.prototype.getConfig = async () => ({ botToken: 'configured-bot' }) as never;
  try {
    const prisma = {
      personChannel: { findFirst: async () => { lookedUpPerson = true; return null; } },
    } as unknown as PrismaService;
    const service = new WebhooksService(prisma, {} as ConfigService);
    await assert.rejects(service.handleTelegram('organization-1', undefined, {
      message: { chat: { id: 123 }, text: 'Complete' },
    }), ForbiddenException);
    assert.equal(lookedUpPerson, false);
  } finally {
    ProviderCredentialStore.prototype.getConfig = originalGetConfig;
  }
});

test('Twilio status callbacks resolve tenant by sending number, not recipient number', async () => {
  const originalLookup = ProviderCredentialStore.prototype.findTwilioWebhookCredential;
  let lookedUpNumber: string | undefined;
  ProviderCredentialStore.prototype.findTwilioWebhookCredential = async (_sid, number) => {
    lookedUpNumber = number;
    return null;
  };
  try {
    const service = new WebhooksService({} as PrismaService, {} as ConfigService);
    await service.handleTwilioStatus({ AccountSid: 'AC123', From: '+15551234567', To: '+15557654321' });
    assert.equal(lookedUpNumber, '+15551234567');
  } finally {
    ProviderCredentialStore.prototype.findTwilioWebhookCredential = originalLookup;
  }
});
