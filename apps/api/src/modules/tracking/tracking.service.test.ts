import assert from 'assert';
import { assertSafeRedirectUrl } from './tracking.service';

// --- assertSafeRedirectUrl ---
assert.doesNotThrow(() => assertSafeRedirectUrl('https://example.com'));
assert.doesNotThrow(() => assertSafeRedirectUrl('http://example.com/path?q=1'));
assert.throws(() => assertSafeRedirectUrl('javascript:alert(1)'), 'blocks javascript:');
assert.throws(() => assertSafeRedirectUrl('data:text/html,<script>'), 'blocks data:');
assert.throws(() => assertSafeRedirectUrl('file:///etc/passwd'), 'blocks file:');
assert.throws(() => assertSafeRedirectUrl('ftp://example.com'), 'blocks ftp:');
assert.throws(() => assertSafeRedirectUrl('not-a-url'), 'blocks invalid urls');
assert.throws(() => assertSafeRedirectUrl(''), 'blocks empty string');

console.log('tracking service tests passed');