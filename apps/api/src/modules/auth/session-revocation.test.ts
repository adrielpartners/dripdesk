import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { EmailService } from '../email/email.service';

test('logout revokes previously issued access tokens', async () => {
  let sessionVersion = 0;
  const user = { id: 'user-1', email: 'test@example.com', role: 'owner', sessionVersion, memberships: [] };
  const prisma = {
    user: {
      update: async () => { sessionVersion += 1; return { ...user, sessionVersion }; },
      findUnique: async () => ({ ...user, sessionVersion }),
    },
  } as unknown as PrismaService;
  const config = { get: () => 'test-session-secret' } as unknown as ConfigService;
  const auth = new AuthService(prisma, {} as JwtService, config, {} as PasswordService, {} as EmailService);
  const strategy = new JwtStrategy(config, prisma);
  const payload = { sub: 'user-1', email: 'test@example.com', role: 'owner', sessionVersion: 0 };

  await strategy.validate(payload);
  assert.deepEqual(await auth.logout('user-1'), { loggedOut: true });
  await assert.rejects(strategy.validate(payload), UnauthorizedException);
  await strategy.validate({ ...payload, sessionVersion: 1 });
});

test('password reset increments the session version', async () => {
  let updatedVersion = false;
  const prisma = {
    passwordResetToken: {
      findUnique: async () => ({ id: 'reset-1', userId: 'user-1', usedAt: null, expiresAt: new Date(Date.now() + 60_000) }),
      update: async () => ({ id: 'reset-1' }),
    },
    user: {
      update: async (query: { data: { sessionVersion?: { increment: number } } }) => {
        updatedVersion = query.data.sessionVersion?.increment === 1;
        return { id: 'user-1' };
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  } as unknown as PrismaService;
  const passwords = { hashPassword: async () => 'new-hash' } as unknown as PasswordService;
  const auth = new AuthService(prisma, {} as JwtService, {} as ConfigService, passwords, {} as EmailService);
  assert.deepEqual(await auth.resetPassword('reset-token', 'new-password'), { reset: true });
  assert.equal(updatedVersion, true);
});
