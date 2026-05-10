import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { runBuildImages, jpegLqip, transcodeAvif } from './build-images-core.mjs';
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

describe('transcodeAvif', () => {
  test('transcodeAvif produces buffers at requested widths', async () => {
    const src = await sharp({
      create: { width: 2000, height: 1500, channels: 3, background: { r: 0, g: 128, b: 64 } },
    }).png().toBuffer();
    const out = await transcodeAvif(src, [640, 1024, 1600]);
    assert.deepEqual(Object.keys(out).sort(), ['1024', '1600', '640']);
    for (const w of [640, 1024, 1600]) {
      const meta = await sharp(out[w]).metadata();
      assert.equal(meta.format, 'heif'); // sharp reports AVIF as heif
      assert.equal(meta.width, w);
    }
    // 640 buffer must be smaller than 1600.
    assert.ok(out[640].length < out[1600].length);
  });
});
