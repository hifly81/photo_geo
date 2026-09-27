import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFileHash } from '@/lib/storage';

test('calculateFileHash returns stable sha256 hashes', () => {
  const a = calculateFileHash(Buffer.from('hello'));
  const b = calculateFileHash(Buffer.from('hello'));
  const c = calculateFileHash(Buffer.from('world'));

  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 64);
});
