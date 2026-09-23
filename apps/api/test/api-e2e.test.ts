import assert from 'node:assert';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

test('API auth and organization boundaries', async (context) => {
  if (process.env.DRIPDESK_E2E_ALLOW_DATA_WRITES !== 'true' || process.env.DRIPDESK_ENV === 'production') {
    throw new Error('Run e2e only against an isolated non-production database with DRIPDESK_E2E_ALLOW_DATA_WRITES=true');
  }
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  await app.listen(0);
  context.after(async () => { await app.close(); });

  const httpServer = app.getHttpServer() as import('http').Server;
  const base = `http://localhost:${(httpServer.address() as import('net').AddressInfo).port}/api`;

  // Smoke: health endpoint returns 200
  const healthRes = await fetch(`${base}/health`);
  assert.strictEqual(healthRes.status, 200, 'health endpoint should return 200');
  const healthData = await healthRes.json() as { ok: boolean };
  assert.strictEqual(healthData.ok, true, 'health should report ok');

  // Smoke: unauthenticated request to protected route returns 401
  const meRes = await fetch(`${base}/auth/me`);
  assert.strictEqual(meRes.status, 401, 'unauthenticated /auth/me should return 401');

  // Registration
  const email = `test-${Date.now()}@example.com`;
  const regRes = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: `Test Org ${Date.now()}`,
    }),
  });
  assert.strictEqual(regRes.status, 201, 'registration should return 201');
  const regData = await regRes.json() as { ok: boolean; data?: { accessToken: string; user: { organizationId: string } } };
  assert.strictEqual(regData.ok, true, 'registration should be ok');
  assert.ok(regData.data?.accessToken, 'registration should return access token');

  const secondEmail = `other-${Date.now()}@example.com`;
  const secondRegistration = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: secondEmail,
      password: 'TestPass123!',
      organizationName: `Other Test Org ${Date.now()}`,
    }),
  });
  assert.strictEqual(secondRegistration.status, 201);
  const secondData = await secondRegistration.json() as { data?: { user: { organizationId: string } } };
  assert.ok(secondData.data?.user.organizationId);

  // Login
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass123!' }),
  });
  assert.strictEqual(loginRes.status, 201, 'login should return 201');
  const loginData = await loginRes.json() as { ok: boolean; data?: { accessToken: string } };
  assert.strictEqual(loginData.ok, true, 'login should be ok');
  assert.ok(loginData.data?.accessToken, 'login should return access token');

  // Authenticated /auth/me with token
  const meAuthRes = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.data!.accessToken}` },
  });
  assert.strictEqual(meAuthRes.status, 200, 'authenticated /auth/me should return 200');
  const meAuthData = await meAuthRes.json() as { ok: boolean; data?: { email: string } };
  assert.strictEqual(meAuthData.ok, true, 'auth/me should be ok');
  assert.strictEqual(meAuthData.data?.email, email, 'auth/me should return correct email');

  const ownPeople = await fetch(`${base}/persons`, {
    headers: {
      Authorization: `Bearer ${loginData.data!.accessToken}`,
      'x-dripdesk-organization-id': regData.data!.user.organizationId,
    },
  });
  assert.strictEqual(ownPeople.status, 200, 'owner can access their own organization');
  const otherPeople = await fetch(`${base}/persons`, {
    headers: {
      Authorization: `Bearer ${loginData.data!.accessToken}`,
      'x-dripdesk-organization-id': secondData.data!.user.organizationId,
    },
  });
  assert.strictEqual(otherPeople.status, 403, 'owner cannot access another organization');

  // Wrong password
  const wrongRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'WrongPass!' }),
  });
  assert.strictEqual(wrongRes.status, 401, 'wrong password should return 401');

  const logoutRes = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${loginData.data!.accessToken}` },
  });
  assert.strictEqual(logoutRes.status, 201, 'logout should return 201');
  const revokedRes = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.data!.accessToken}` },
  });
  assert.strictEqual(revokedRes.status, 401, 'logged-out token must be rejected');

  console.log('api-e2e tests passed');
});
