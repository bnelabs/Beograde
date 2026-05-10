import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { runBuildImages, jpegLqip, transcodeAvif, loadCurator, fetchCommonsFile, slugify, writeAvifSet } from './build-images-core.mjs';
import sharp from 'sharp';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

describe('loadCurator', () => {
  test('loadCurator returns parsed object on valid file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curator-'));
    try {
      const file = join(dir, 'kalemegdan.json');
      writeFileSync(file, JSON.stringify({
        images: [{
          commonsFile: 'File:Kalemegdan_Belgrade.jpg',
          credit: 'Foo, CC BY-SA 4.0',
          license: 'CC BY-SA 4.0',
          source: 'https://commons.wikimedia.org/wiki/File:Kalemegdan_Belgrade.jpg',
        }],
        fetchedAt: '2026-05-10',
      }));
      const c = loadCurator(file);
      assert.equal(c.images.length, 1);
      assert.equal(c.images[0].commonsFile, 'File:Kalemegdan_Belgrade.jpg');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('loadCurator throws on missing required field', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curator-'));
    try {
      const file = join(dir, 'broken.json');
      writeFileSync(file, JSON.stringify({ images: [{ commonsFile: 'File:X.jpg' }], fetchedAt: '2026-05-10' }));
      assert.throws(() => loadCurator(file), /credit|license|source/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('loadCurator throws when commonsFile lacks File: prefix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curator-'));
    try {
      const file = join(dir, 'bad.json');
      writeFileSync(file, JSON.stringify({
        images: [{ commonsFile: 'X.jpg', credit: 'a', license: 'b', source: 'c' }],
        fetchedAt: '2026-05-10',
      }));
      assert.throws(() => loadCurator(file), /File:/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('loadCurator throws when top-level JSON is not an object', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curator-'));
    try {
      const file = join(dir, 'array.json');
      writeFileSync(file, JSON.stringify(['not', 'an', 'object']));
      assert.throws(() => loadCurator(file), /top-level value must be an object/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('loadCurator throws when fetchedAt is not a string', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curator-'));
    try {
      const file = join(dir, 'numeric-date.json');
      writeFileSync(file, JSON.stringify({
        images: [{ commonsFile: 'File:X.jpg', credit: 'a', license: 'b', source: 'c' }],
        fetchedAt: 2026,
      }));
      assert.throws(() => loadCurator(file), /fetchedAt must be a non-empty string/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('fetchCommonsFile', () => {
  test('fetchCommonsFile resolves Special:FilePath URL and returns buffer', async () => {
    const fakeBuffer = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).jpeg().toBuffer();
    const calls = [];
    const fetchFn = async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: async () => fakeBuffer.buffer.slice(fakeBuffer.byteOffset, fakeBuffer.byteOffset + fakeBuffer.byteLength),
      };
    };
    const { buffer, width, height } = await fetchCommonsFile('File:Foo_Bar.jpg', fetchFn);
    assert.ok(Buffer.isBuffer(buffer));
    assert.equal(width, 1200);
    assert.equal(height, 800);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/Foo_Bar\.jpg/);
  });

  test('fetchCommonsFile throws on non-2xx', async () => {
    const fetchFn = async () => ({ ok: false, status: 404, statusText: 'Not Found' });
    await assert.rejects(
      () => fetchCommonsFile('File:Missing.jpg', fetchFn),
      /404/,
    );
  });

  test('fetchCommonsFile percent-encodes file names with reserved or non-ASCII characters', async () => {
    const fakeBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
    }).jpeg().toBuffer();
    const calls = [];
    const fetchFn = async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => fakeBuffer.buffer.slice(fakeBuffer.byteOffset, fakeBuffer.byteOffset + fakeBuffer.byteLength),
      };
    };
    await fetchCommonsFile("File:Saint Sava's Temple ?.jpg", fetchFn);
    // The space, apostrophe, and ? must all be percent-encoded so the path
    // segment cannot be confused with the ?width=2400 query string.
    assert.equal(calls.length, 1);
    assert.ok(!calls[0].includes(' '), `URL should not contain literal spaces: ${calls[0]}`);
    assert.ok(calls[0].includes('%20'), `URL should percent-encode spaces: ${calls[0]}`);
    // The ? in the file name should be encoded as %3F so the only `?`
    // remaining is the one introducing ?width=2400.
    const queryStart = calls[0].lastIndexOf('?');
    assert.ok(calls[0].slice(queryStart) === '?width=2400', `query string should be exactly ?width=2400, got: ${calls[0].slice(queryStart)}`);
  });
});

describe('slugify', () => {
  test('slugify lowercases, strips diacritics, and joins with -', () => {
    assert.equal(slugify('Tara_National_Park_Tara_View.jpg'), 'tara-national-park-tara-view');
    assert.equal(slugify('Saint Sava Cathedral (interior).JPG'), 'saint-sava-cathedral-interior');
    assert.equal(slugify('Beograd_–_Kalemegdan.jpeg'), 'beograd-kalemegdan');
  });
});

describe('writeAvifSet', () => {
  test('writeAvifSet writes one file per width with correct naming', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avifout-'));
    try {
      const transcoded = {
        640: Buffer.from([0x00, 0x01]),
        1024: Buffer.from([0x00, 0x02, 0x03]),
        1600: Buffer.from([0x00, 0x04, 0x05, 0x06]),
      };
      const paths = await writeAvifSet({
        outDir: dir,
        poiId: 'kalemegdan',
        slug: 'kalemegdan-belgrade',
        transcoded,
      });
      assert.equal(paths[640].endsWith('/kalemegdan/kalemegdan-belgrade-640.avif'), true);
      assert.equal(paths[1024].endsWith('/kalemegdan/kalemegdan-belgrade-1024.avif'), true);
      assert.equal(paths[1600].endsWith('/kalemegdan/kalemegdan-belgrade-1600.avif'), true);
      for (const w of [640, 1024, 1600]) {
        assert.ok(existsSync(paths[w]));
        assert.equal(readFileSync(paths[w]).length, transcoded[w].length);
      }
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
