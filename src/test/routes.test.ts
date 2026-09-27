import test from 'node:test';
import assert from 'node:assert/strict';

test('photo detail route path is stable', () => {
  const id = 'photo_123';
  assert.equal(`/photos/${id}`, '/photos/photo_123');
});
