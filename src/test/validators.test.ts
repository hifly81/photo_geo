import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadConstraints } from '../lib/validators';

test('upload constraints are configured sanely', () => {
  assert.equal(uploadConstraints.maxFileSizeBytes, 10 * 1024 * 1024);
  assert.deepEqual(uploadConstraints.allowedMimeTypes, [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]);
});
