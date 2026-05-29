import { createHash, randomBytes } from 'node:crypto';

export type UnsubscribeAction = 'campaign' | 'global' | 'delete';

export function createUnsubscribeToken() {
  return randomBytes(24).toString('base64url');
}

export function hashUnsubscribeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
