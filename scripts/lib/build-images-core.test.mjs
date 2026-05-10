import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBuildImages } from './build-images-core.mjs';

test('runBuildImages exists', () => {
  assert.equal(typeof runBuildImages, 'function');
});
