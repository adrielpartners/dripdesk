import assert from 'assert';
import { verifyTwilioSignature } from './webhooks.service';

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
