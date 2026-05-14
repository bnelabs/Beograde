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

  test('translit-fills sr_cyr inside activities[].title and activities[].summary', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    const src = [
      {
        id: 'p1', region: 'city', category: 'sight',
        name: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        description: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        address: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        lng: 0, lat: 0, tags: [], images: [],
        verifiedAt: '2026-05-04',
        sources: [{ kind: 'official', url: 'x', org: 'TOB' }],
        reliability: { score: 0, checks: { wikipedia: false, osm: false, official: false, crowdsourced: false } },
        editorialConfidence: 'high',
        provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' },
        activities: [{
          title: { en: 'Walk the ramparts', sr_lat: 'Šetnja bedemima', sr_cyr: '' },
          icon: 'directions_walk', durationMin: 45, budget: 'free', intensity: 'easy',
          summary: { en: 'Loop the upper terraces.', sr_lat: 'Obilazak gornje terase.', sr_cyr: '' },
        }],
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
    assert.equal(compiled[0].activities[0].title.sr_cyr, 'Шетња бедемима');
    assert.equal(compiled[0].activities[0].summary.sr_cyr, 'Обилазак горње терасе.');
    // Non-bilingual fields should pass through untouched.
    assert.equal(compiled[0].activities[0].icon, 'directions_walk');
    assert.equal(compiled[0].activities[0].durationMin, 45);
    assert.equal(compiled[0].activities[0].budget, 'free');
    assert.equal(compiled[0].activities[0].intensity, 'easy');
    rmSync(dir, { recursive: true, force: true });
  });

  test('translit-fills sr_cyr for highlights, tips, history, whatToExpect', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    const src = [
      {
        id: 'p1', region: 'city', category: 'sight',
        name: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        description: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        address: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        lng: 0, lat: 0, tags: [], images: [],
        verifiedAt: '2026-05-04',
        sources: [{ kind: 'official', url: 'x', org: 'TOB' }],
        reliability: { score: 0, checks: { wikipedia: false, osm: false, official: false, crowdsourced: false } },
        editorialConfidence: 'high',
        provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' },
        highlights: [{ en: 'Old wall', sr_lat: 'Stari zid', sr_cyr: '' }],
        tips: [{ en: 'Go at sunset', sr_lat: 'Idite u sumrak', sr_cyr: '' }],
        history: { en: 'Built in 1521.', sr_lat: 'Sagrađen 1521.', sr_cyr: '' },
        whatToExpect: {
          pros: [{ en: 'Free entry', sr_lat: 'Besplatan ulaz', sr_cyr: '' }],
          cons: [{ en: 'Steep stairs', sr_lat: 'Strme stepenice', sr_cyr: '' }],
        },
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
    assert.equal(compiled[0].highlights[0].sr_cyr, 'Стари зид');
    assert.equal(compiled[0].tips[0].sr_cyr, 'Идите у сумрак');
    assert.equal(compiled[0].history.sr_cyr, 'Саграђен 1521.');
    assert.equal(compiled[0].whatToExpect.pros[0].sr_cyr, 'Бесплатан улаз');
    assert.equal(compiled[0].whatToExpect.cons[0].sr_cyr, 'Стрме степенице');
    rmSync(dir, { recursive: true, force: true });
  });

  test('preserves images[] from a prior compiled.json so build-images data is not stripped', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    const src = [
      {
        id: 'p1', region: 'city', category: 'sight',
        name: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        description: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        address: { en: 'X', sr_lat: 'X', sr_cyr: '' },
        lng: 0, lat: 0, tags: [], images: [],
        verifiedAt: '2026-05-04', sources: [{ kind: 'official', url: 'x', org: 'TOB' }],
        reliability: { score: 0, checks: { wikipedia: false, osm: false, official: false, crowdsourced: false } },
        editorialConfidence: 'high',
        provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' },
      },
    ];
    const srcPath = join(dir, 'pois.json');
    const outPath = join(dir, 'pois.compiled.json');
    writeFileSync(srcPath, JSON.stringify(src));
    // Simulate a prior build-images run having merged ImageAsset[] into the
    // compiled.json — this is exactly the state build-provenance must preserve.
    const priorCompiled = [{
      ...src[0],
      images: [{
        src: '/assets/poi/p1/hero-1024.avif', width: 1024, height: 768,
        lqip: 'data:image/jpeg;base64,abc', credit: 'X', license: 'CC0', source: 'https://x',
      }],
    }];
    writeFileSync(outPath, JSON.stringify(priorCompiled));

    await runBuildProvenance({ srcPath, outPath, cacheDir: dir, fetchFn: async () => ({ ok: false }) });

    const compiled = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.equal(compiled[0].images.length, 1);
    assert.equal(compiled[0].images[0].src, '/assets/poi/p1/hero-1024.avif');
    rmSync(dir, { recursive: true, force: true });
  });

  test('does not preserve a prior images[] for a POI that was removed from pois.json', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    // src has only p1; compiled previously had p1 and p2.
    const src = [{
      id: 'p1', region: 'city', category: 'sight',
      name: { en: 'X', sr_lat: 'X', sr_cyr: '' },
      description: { en: 'X', sr_lat: 'X', sr_cyr: '' },
      address: { en: 'X', sr_lat: 'X', sr_cyr: '' },
      lng: 0, lat: 0, tags: [], images: [],
      verifiedAt: '2026-05-04', sources: [{ kind: 'official', url: 'x', org: 'TOB' }],
      reliability: { score: 0, checks: { wikipedia: false, osm: false, official: false, crowdsourced: false } },
      editorialConfidence: 'high',
      provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' },
    }];
    writeFileSync(join(dir, 'pois.json'), JSON.stringify(src));
    writeFileSync(join(dir, 'pois.compiled.json'), JSON.stringify([
      { ...src[0], images: [{ src: 'p1.avif', width: 1, height: 1, lqip: 'x', credit: 'x', license: 'x', source: 'x' }] },
      { ...src[0], id: 'p2', images: [{ src: 'p2.avif', width: 1, height: 1, lqip: 'x', credit: 'x', license: 'x', source: 'x' }] },
    ]));

    await runBuildProvenance({
      srcPath: join(dir, 'pois.json'),
      outPath: join(dir, 'pois.compiled.json'),
      cacheDir: dir,
      fetchFn: async () => ({ ok: false }),
    });

    const compiled = JSON.parse(readFileSync(join(dir, 'pois.compiled.json'), 'utf8'));
    assert.equal(compiled.length, 1);
    assert.equal(compiled[0].id, 'p1');
    rmSync(dir, { recursive: true, force: true });
  });

  test('auto-drafts tr from en when tr is empty; preserves existing tr', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bp-'));
    const src = [
      {
        id: 'p1', region: 'city', category: 'sight',
        name: { en: 'Kalemegdan', sr_lat: 'Kalemegdan', sr_cyr: '', tr: '' },
        description: { en: 'Old fort.', sr_lat: 'Stara tvrđava.', sr_cyr: '', tr: 'Eski kale.' },
        address: { en: 'Kalemegdan Park', sr_lat: 'Kalemegdanski park', sr_cyr: '', tr: '' },
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
    // Empty tr is auto-drafted from en.
    assert.equal(compiled[0].name.tr, 'Kalemegdan');
    assert.equal(compiled[0].address.tr, 'Kalemegdan Park');
    // Existing non-empty tr is preserved.
    assert.equal(compiled[0].description.tr, 'Eski kale.');
    rmSync(dir, { recursive: true, force: true });
  });
});
