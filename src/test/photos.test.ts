import test from 'node:test';
import assert from 'node:assert/strict';
import { imageContentTypeFromPath } from '@/lib/photos';

test('imageContentTypeFromPath resolves common image types', () => {
  assert.equal(imageContentTypeFromPath('photo.jpg'), 'image/jpeg');
  assert.equal(imageContentTypeFromPath('photo.jpeg'), 'image/jpeg');
  assert.equal(imageContentTypeFromPath('photo.png'), 'image/png');
  assert.equal(imageContentTypeFromPath('photo.webp'), 'image/webp');
  assert.equal(imageContentTypeFromPath('photo.gif'), 'image/gif');
  assert.equal(imageContentTypeFromPath('photo.unknown'), 'application/octet-stream');
});
