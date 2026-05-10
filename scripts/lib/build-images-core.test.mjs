import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { runBuildImages, jpegLqip } from './build-images-core.mjs';
import sharp from 'sharp';

describe('build-images', () => {
  test('runBuildImages exists', () => {
    assert.equal(typeof runBuildImages, 'function');
  });
});

describe('jpegLqip', () => {
  test('jpegLqip produces a base64 data-URI from an 8x8 JPEG', async () => {
    // Generate a known 64x64 red PNG buffer.
    const buf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).png().toBuffer();
    const dataUri = await jpegLqip(buf);
    assert.match(dataUri, /^data:image\/jpeg;base64,/);
    // 8x8 JPEG, low quality — well under 1KB.
    assert.ok(dataUri.length < 1024, `lqip too large: ${dataUri.length}`);
  });
});
