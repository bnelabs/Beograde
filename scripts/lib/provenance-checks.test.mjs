import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  checkWikipedia,
  checkOSM,
  checkOfficial,
  checkCrowdsourced,
  score,
  isPublishable,
} from './provenance-checks.mjs';

describe('checkWikipedia', () => {
  test('returns pass=true for a non-stub article', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        pages: [
          {
            extract: 'Belgrade Fortress is a fortress consisting of...'.padEnd(600, ' x'),
            content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Belgrade_Fortress' } },
          },
        ],
      }),
    });
    const r = await checkWikipedia('Belgrade Fortress', 'en', fakeFetch);
    assert.equal(r.pass, true);
    assert.equal(r.url, 'https://en.wikipedia.org/wiki/Belgrade_Fortress');
  });

  test('returns pass=false when the article is too short (stub)', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ pages: [{ extract: 'Stub.', content_urls: { desktop: { page: 'x' } } }] }),
    });
    const r = await checkWikipedia('Stubby', 'en', fakeFetch);
    assert.equal(r.pass, false);
  });

  test('returns pass=false on 404', async () => {
    const fakeFetch = async () => ({ ok: false, status: 404 });
    const r = await checkWikipedia('Nonexistent', 'en', fakeFetch);
    assert.equal(r.pass, false);
  });

  test('returns pass=false when title is null', async () => {
    const r = await checkWikipedia(null, 'en', async () => { throw new Error('should not call'); });
    assert.equal(r.pass, false);
  });
});

describe('checkOSM', () => {
  test('returns pass=true when Overpass returns a tagged element', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ elements: [{ id: 8645819, type: 'relation', tags: { name: 'Beogradska tvrđava', 'opening_hours': '24/7' } }] }),
    });
    const r = await checkOSM('relation/8645819', fakeFetch);
    assert.equal(r.pass, true);
    assert.equal(r.ref, 'relation/8645819');
  });

  test('returns pass=false when element has no name tag', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ elements: [{ id: 1, type: 'node', tags: {} }] }),
    });
    const r = await checkOSM('node/1', fakeFetch);
    assert.equal(r.pass, false);
  });

  test('returns pass=false when ref is null', async () => {
    const r = await checkOSM(null, async () => { throw new Error(); });
    assert.equal(r.pass, false);
  });
});

describe('checkOfficial', () => {
  test('returns pass=true when at least one source kind is "official"', () => {
    const r = checkOfficial([{ kind: 'official', url: 'https://tob.rs/x', org: 'TOB' }]);
    assert.equal(r.pass, true);
    assert.equal(r.url, 'https://tob.rs/x');
  });
  test('returns pass=false when no official source', () => {
    const r = checkOfficial([{ kind: 'wikipedia', url: 'x', lang: 'en' }]);
    assert.equal(r.pass, false);
  });
});

describe('checkCrowdsourced', () => {
  test('passes when google review count meets threshold', () => {
    const r = checkCrowdsourced([{ kind: 'google-places', placeId: 'x', reviewCount: 1200, rating: 4.4, checkedAt: '2026-05-04' }]);
    assert.equal(r.pass, true);
  });
  test('fails when below threshold', () => {
    const r = checkCrowdsourced([{ kind: 'google-places', placeId: 'x', reviewCount: 80, rating: 4.4, checkedAt: '2026-05-04' }]);
    assert.equal(r.pass, false);
  });
  test('passes when tripadvisor meets its threshold even if google is below', () => {
    const r = checkCrowdsourced([
      { kind: 'google-places', placeId: 'x', reviewCount: 100, rating: 4.4, checkedAt: '2026-05-04' },
      { kind: 'tripadvisor', url: 'y', reviewCount: 250, rating: 4.5, checkedAt: '2026-05-04' },
    ]);
    assert.equal(r.pass, true);
  });
});

describe('score and isPublishable', () => {
  test('25 points per passing check', () => {
    assert.equal(score({ wikipedia: true, osm: false, official: false, crowdsourced: false }), 25);
    assert.equal(score({ wikipedia: true, osm: true, official: true, crowdsourced: true }), 100);
    assert.equal(score({ wikipedia: false, osm: false, official: false, crowdsourced: false }), 0);
  });

  test('publishable when one of wikipedia/osm/official passes', () => {
    assert.equal(isPublishable({ checks: { wikipedia: true, osm: false, official: false, crowdsourced: false }, editorialConfidence: 'low' }), true);
  });

  test('publishable when editorialConfidence is high even if all checks fail', () => {
    assert.equal(isPublishable({ checks: { wikipedia: false, osm: false, official: false, crowdsourced: false }, editorialConfidence: 'high' }), true);
  });

  test('NOT publishable when checks fail and editorialConfidence is low', () => {
    assert.equal(isPublishable({ checks: { wikipedia: false, osm: false, official: false, crowdsourced: false }, editorialConfidence: 'low' }), false);
  });
});
