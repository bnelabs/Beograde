import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { runBuildImages } from './build-images-core.mjs';

describe('build-images', () => {
  test('runBuildImages exists', () => {
    assert.equal(typeof runBuildImages, 'function');
  });
});
