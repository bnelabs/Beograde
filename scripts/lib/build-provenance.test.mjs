import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBuildProvenance } from './build-provenance-core.mjs';

describe('build-provenance', () => {
  test('emits compiled JSON with scored checks; passes publish gate', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    const src = [
      {
        id: 'p1',
        region: 'city',
        category: 'sight',
        name: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        description: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        address: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        lng: 0, lat: 0, tags: [], images: [],
        verifiedAt: '2026-05-04', sources: [
          { kind: 'official', url: 'https://tob.rs/p1', org: 'TOB' },
        ],
        reliability: { score: 0, checks: { wikipedia: false, osm: false, official: false, crowdsourced: false } },
        editorialConfidence: 'high',
        provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' },
      },
    ];
    const srcPath = join(dir, 'pois.json');
    const outPath = join(dir, 'pois.compiled.json');
    writeFileSync(srcPath, JSON.stringify(src));

    const fakeFetch = async () => ({ ok: false, status: 404 });
    const result = await runBuildProvenance({ srcPath, outPath, cacheDir: dir, fetchFn: fakeFetch });

    assert.equal(result.published, 1);
    assert.equal(result.failed, 0);

    const compiled = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.equal(compiled[0].reliability.checks.official, true);
    assert.equal(compiled[0].reliability.score, 25);

    rmSync(dir, { recursive: true, force: true });
  });

  test('fails the build when a POI is unpublishable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    const src = [
      {
        id: 'bad',
        region: 'city', category: 'sight',
        name: { en: 'B', sr_lat: 'B', sr_cyr: '' },
        description: { en: 'B', sr_lat: 'B', sr_cyr: '' },
        address: { en: 'B', sr_lat: 'B', sr_cyr: '' },
        lng: 0, lat: 0, tags: [], images: [],
        verifiedAt: '2026-05-04', sources: [],
        reliability: { score: 0, checks: { wikipedia: false, osm: false, official: false, crowdsourced: false } },
        editorialConfidence: 'low',
        provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' },
      },
    ];
    writeFileSync(join(dir, 'pois.json'), JSON.stringify(src));
    const result = await runBuildProvenance({
      srcPath: join(dir, 'pois.json'),
      outPath: join(dir, 'pois.compiled.json'),
      cacheDir: dir,
      fetchFn: async () => ({ ok: false }),
    });
    assert.equal(result.failed, 1);
    rmSync(dir, { recursive: true, force: true });
  });

  test('fills name.sr_cyr / description.sr_cyr / address.sr_cyr from sr_lat via translit', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    const src = [
      {
        id: 'p1', region: 'city', category: 'sight',
        name: { en: 'Belgrade Fortress', sr_lat: 'Beogradska tvrđava', sr_cyr: '' },
        description: { en: 'Old fort.', sr_lat: 'Stara tvrđava.', sr_cyr: '' },
        address: { en: 'Kalemegdan Park', sr_lat: 'Kalemegdanski park', sr_cyr: '' },
        lng: 0, lat: 0, tags: [], images: [],
        verifiedAt: '2026-05-04', sources: [{ kind: 'official', url: 'x', org: 'TOB' }],
        reliability: { score: 0, checks: { wikipedia: false, osm: false, official: false, crowdsourced: false } },
        editorialConfidence: 'high',
        provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' },
      },
    ];
    writeFileSync(join(dir, 'pois.json'), JSON.stringify(src));
    await runBuildProvenance({
      srcPath: join(dir, 'pois.json'),
      outPath: join(dir, 'pois.compiled.json'),
      cacheDir: dir,
      fetchFn: async () => ({ ok: false }),
    });
    const compiled = JSON.parse(readFileSync(join(dir, 'pois.compiled.json'), 'utf8'));
    assert.equal(compiled[0].name.sr_cyr, 'Београдска тврђава');
    assert.equal(compiled[0].address.sr_cyr, 'Калемегдански парк');
    rmSync(dir, { recursive: true, force: true });
  });
});
