# Beograde Redesign — Phase 1b.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the build-time content pipelines (provenance scoring, SR-Cyrillic transliteration) that the rest of Phase 1b depends on, complete SR-Latin coverage for all POIs and itineraries (closes the Phase-1a smoke-test gap where every bilingual `sr_lat` field was a copy of `en`), and flip the Cyrillic UI toggle on with a clean Latin↔Cyrillic round-trip.

**Architecture:** Two new build scripts (`scripts/build-provenance.mjs`, `scripts/build-i18n.mjs`) read source files (`src/assets/pois.json`, `src/i18n/sr-Latn.json`, `src/i18n/sr-cyr-overrides.json`) and emit two new artefacts (`src/assets/pois.compiled.json`, `src/i18n/sr-Cyrl.json`) consumed at runtime. Pure logic lives in `scripts/lib/*.mjs` modules so it can be unit-tested via `node --test` (zero new dependencies). UI components consolidate their hand-rolled `enStrings vs srLatStrings` ternary into a single `StringsService` so adding the third Cyrillic locale is one edit per component.

**Tech Stack:** Node 22+ built-in `fetch` and `node:test`; existing Angular 21 zoneless + signals stack; no new npm dependencies for this slice (image pipeline deferred to Phase 1b.2 because `sharp` / `avifenc` adds significant native deps).

---

## Translation policy (read before Tasks 5, 6, 10)

This slice introduces ~100 SR-Latin strings (32 POI names + 32 descriptions + 32 addresses + 5 itinerary subtitles + missing stop notes). They are **draft Serbian translations** — produced inline against the live source EN strings — with each translated bilingual record carrying a sidecar `translatedBy: 'auto-draft' | 'curator'` flag so anyone reviewing the data can tell drafts from curator-validated content. A curator can replace any draft string in a follow-up commit; the runtime treats both flags identically, the metadata is purely audit-trail. The flag goes on a new top-level `provenance` block on `Itinerary` and on `POI`, **not** on each `Bilingual` value, so the schema stays clean.

If the user wants to gate the slice on curator-validated translations instead, halt before Task 5 and surface that choice — the rest of the plan (Tasks 1–4, 7–9, 11–13) is unaffected.

---

## File Structure

### New files

| Path | Purpose |
|---|---|
| `scripts/lib/provenance-checks.mjs` | Pure helpers: `checkWikipedia`, `checkOSM`, `checkOfficial`, `checkCrowdsourced`, `score`, `isPublishable`. Each takes its inputs and an injected `fetch`-like, returns `{ pass, ref }`. |
| `scripts/lib/provenance-checks.test.mjs` | `node --test` unit suite. Mocks fetch; covers each check, scoring, publish-rule gate, edge cases. |
| `scripts/build-provenance.mjs` | CLI entry point. Reads `src/assets/pois.json` + `data/provenance-cache/<id>.json` (when present), runs checks, emits `src/assets/pois.compiled.json`. Validates publish rule; non-zero exit on any unpublishable POI. Also fills `name.sr_cyr / description.sr_cyr / address.sr_cyr` via `lib/translit.mjs`. |
| `scripts/lib/translit.mjs` | Deterministic Latin → Cyrillic transliteration for Serbian. Handles digraphs (`lj→љ`, `nj→њ`, `dj→ђ`, `dž→џ`), case preservation, punctuation passthrough. Exports `latnToCyrl`, `cyrlToLatn` (round-trip), `roundTripsCleanly`. |
| `scripts/lib/translit.test.mjs` | `node --test` suite. Each digraph rule, edge cases (capitalised digraph "Lj" vs "LJ"), foreign loanwords (round-trip fails → caller adds override), punctuation/numerals untouched. |
| `scripts/build-i18n.mjs` | CLI. Reads `src/i18n/sr-Latn.json` + `src/i18n/sr-cyr-overrides.json`, emits `src/i18n/sr-Cyrl.json`. Round-trips each value; logs a warning per non-clean round-trip and fails the build unless every warned key has an override entry. |
| `scripts/lib/image-pipeline.mjs` | (stub for 1b.2 — empty; not implemented in this slice) |
| `scripts/run-tests.mjs` | Tiny driver: runs `node --test scripts/lib/*.test.mjs` with consistent reporter + non-zero exit on failure. |
| `data/provenance-cache/.gitkeep` | Reserve the dir for manually-pasted Google Places JSON; documented in `data/provenance-cache/README.md`. |
| `data/provenance-cache/README.md` | Document the manual paste workflow (no live API calls). |
| `src/i18n/sr-cyr-overrides.json` | Hand-curated override map: `{ "settings.install": "Инсталирај Београд водич", ... }`. Initially empty `{}`; round-trip QA tells the curator what to add. |
| `src/i18n/sr-Cyrl.json` | **Generated** by `build-i18n.mjs` from sr-Latn + overrides. Committed because the SW prefetches it. |
| `src/app/core/i18n/strings.service.ts` | New consolidating service. Imports all three locale JSONs, exposes `t = computed(() => …)` keyed off `I18nService.locale()`. |
| `src/app/core/i18n/strings.service.spec.ts` | Unit tests: defaults to EN, switches to SR-Latin, switches to SR-Cyrl, falls back to SR-Latin if `script === 'Cyrl'` but `cyrillicEnabled === false`. |
| `src/assets/pois.compiled.json` | **Generated** by `build-provenance.mjs`. Committed (deterministic, deps-free at runtime). |
| `docs/superpowers/plans/2026-05-04-beograde-redesign-phase-1b-1.md` | This document. |

### Modified files

| Path | Change |
|---|---|
| `src/app/data/types.ts` | Add optional `wikipediaTitle?: string` and `osmRef?: string` hint fields on `POI`. Add new `provenance: { translatedBy: 'auto-draft' \| 'curator'; lastReviewedAt: string }` block on `POI` and on `Itinerary`. Add `cyrillicEnabled` flag on `ResolvedLocale` is **not** added here — that already lives on `I18nService`. |
| `src/assets/pois.json` | (a) Add `wikipediaTitle` / `osmRef` for each of the 32 city POIs. (b) Translate every `name.sr_lat`, `description.sr_lat`, `address.sr_lat` to Serbian Latin. (c) Add `provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' }`. |
| `src/app/data/itineraries.ts` | Translate the 5 SR-Latin subtitles still defaulted to EN; translate every stop `notes.sr_lat`. Add `provenance: { translatedBy: 'auto-draft', lastReviewedAt: '2026-05-04' }`. |
| `src/app/data/poi.service.ts` (or wherever `pois.json` is fetched) | Switch the runtime fetch from `assets/pois.json` to `assets/pois.compiled.json`. |
| `src/app/core/i18n/i18n.service.ts` | Set `CYRILLIC_ENABLED = true`. |
| `src/app/app.ts`, `saved.component.ts`, `settings.component.ts`, `home.component.ts`, `poi-detail.component.ts`, `map.component.ts`, `poi-list.component.ts`, `itinerary-detail.component.ts`, `itinerary-list.component.ts`, `trips.component.ts` | Replace local `enStrings`/`srLatStrings` imports + `t = computed(...)` ternary with `t = inject(StringsService).t`. |
| `ngsw-config.json` | Add `/assets/pois.compiled.json` to the `content` asset group; remove `/assets/pois.json` (still committed for source-of-truth, but no longer prefetched). |
| `package.json` | Add `build:provenance`, `build:i18n`, `test:scripts`, `prebuild` (chains the above) scripts. |
| `scripts/README.md` | Document the new pipelines and the `npm run prebuild` chain. |

### Out of scope for this slice (deferred to Phase 1b.2)

- `scripts/fetch-poi-images.mjs` and `src/assets/poi/<id>/*.avif` — image pipeline.
- 18 new day-trip POIs and the Trips/day-trip detail UI.
- Five remaining charts.
- Editorial story cards, first-run flow polish, map style refresh.

---

## Task 1: Test runner for build scripts

**Files:**
- Create: `scripts/run-tests.mjs`
- Modify: `package.json`
- Modify: `scripts/README.md`

- [ ] **Step 1: Add the runner**

`scripts/run-tests.mjs`:

```js
#!/usr/bin/env node
// Run every `*.test.mjs` under `scripts/lib/` through node:test.
// Exits non-zero if any test fails; intentionally minimal so CI can drive it.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const libDir = resolve(here, 'lib');
const tests = readdirSync(libDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => resolve(libDir, f));

if (tests.length === 0) {
  console.log('no script tests found');
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  ['--test', '--test-reporter=spec', ...tests],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
```

- [ ] **Step 2: Add npm script**

In `package.json`, under `"scripts"`, add:

```json
"test:scripts": "node scripts/run-tests.mjs"
```

- [ ] **Step 3: Sanity-check**

Add a throwaway test file to prove the runner works:

`scripts/lib/_sanity.test.mjs`:

```js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
test('node:test runner is wired', () => {
  assert.equal(2 + 2, 4);
});
```

Run: `npm run test:scripts`
Expected: `1 passed, 0 failed`.

- [ ] **Step 4: Remove the sanity test, keep the runner**

```bash
rm scripts/lib/_sanity.test.mjs
```

- [ ] **Step 5: Document in scripts/README.md**

Append after the existing table in `scripts/README.md`:

```markdown
## Tests

Build-script logic is tested via Node's built-in test runner:

    npm run test:scripts

The Angular unit tests are still:

    npm test -- --watch=false
```

- [ ] **Step 6: Commit**

```bash
git add scripts/run-tests.mjs package.json scripts/README.md
git commit -m "test(scripts): add node --test runner for .mjs build scripts"
```

---

## Task 2: Provenance check helpers (pure logic, TDD)

**Files:**
- Create: `scripts/lib/provenance-checks.mjs`
- Create: `scripts/lib/provenance-checks.test.mjs`

- [ ] **Step 1: Write the failing test for `checkWikipedia`**

`scripts/lib/provenance-checks.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:scripts`
Expected: FAIL — `Cannot find module './provenance-checks.mjs'`.

- [ ] **Step 3: Implement `checkWikipedia` minimally**

`scripts/lib/provenance-checks.mjs`:

```js
// Stub. Other check helpers added in subsequent steps; see this file's full
// shape after Task 2 completes.

const MIN_EXTRACT_CHARS = 400;

export async function checkWikipedia(title, lang, fetchFn = globalThis.fetch) {
  if (!title) return { pass: false };
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  // Wikimedia REST returns single-page summary; we use it because it's quotaless.
  const res = await fetchFn(url, {
    headers: { 'user-agent': 'Beograde build-provenance (https://beograde.app)' },
  });
  if (!res.ok) return { pass: false };
  const json = await res.json();
  const page = (json.pages?.[0]) ?? json;
  const extract = page.extract ?? '';
  if (extract.length < MIN_EXTRACT_CHARS) return { pass: false };
  return {
    pass: true,
    url: page.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}
```

- [ ] **Step 4: Run tests; expect failures**

Run: `npm run test:scripts`
Expected: 4 tests for `checkWikipedia`. Some pass, some still need adapting because the test fixture wraps results as `{ pages: [...] }`. Adjust the implementation until all 4 pass.

- [ ] **Step 5: Add `checkOSM` test**

Append to `provenance-checks.test.mjs`:

```js
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
```

- [ ] **Step 6: Implement `checkOSM`**

Append to `provenance-checks.mjs`:

```js
const OVERPASS = 'https://overpass-api.de/api/interpreter';

export async function checkOSM(ref, fetchFn = globalThis.fetch) {
  if (!ref) return { pass: false };
  const [type, id] = ref.split('/');
  if (!['node', 'way', 'relation'].includes(type) || !id) return { pass: false };
  const query = `[out:json][timeout:15]; ${type}(${id}); out tags;`;
  const res = await fetchFn(OVERPASS, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return { pass: false };
  const json = await res.json();
  const el = json.elements?.[0];
  if (!el?.tags?.name) return { pass: false };
  return { pass: true, ref };
}
```

- [ ] **Step 7: Add `checkOfficial` and `checkCrowdsourced` tests + implementations**

Append both tests to the test file:

```js
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
```

Append to `provenance-checks.mjs`:

```js
const GOOGLE_REVIEW_THRESHOLD = 500;
const TRIPADVISOR_REVIEW_THRESHOLD = 200;

export function checkOfficial(sources) {
  const hit = sources.find((s) => s.kind === 'official');
  return hit ? { pass: true, url: hit.url, org: hit.org } : { pass: false };
}

export function checkCrowdsourced(sources) {
  const g = sources.find((s) => s.kind === 'google-places');
  const t = sources.find((s) => s.kind === 'tripadvisor');
  if (g && g.reviewCount >= GOOGLE_REVIEW_THRESHOLD) return { pass: true };
  if (t && t.reviewCount >= TRIPADVISOR_REVIEW_THRESHOLD) return { pass: true };
  return { pass: false };
}
```

- [ ] **Step 8: Add `score` and `isPublishable` tests + implementations**

Append to the test file:

```js
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
```

Append to `provenance-checks.mjs`:

```js
export function score(checks) {
  return Object.values(checks).filter(Boolean).length * 25;
}

export function isPublishable({ checks, editorialConfidence }) {
  return checks.wikipedia || checks.osm || checks.official || editorialConfidence === 'high';
}
```

- [ ] **Step 9: Run the full suite to confirm all green**

Run: `npm run test:scripts`
Expected: ~12 tests, all passing.

- [ ] **Step 10: Commit**

```bash
git add scripts/lib/provenance-checks.mjs scripts/lib/provenance-checks.test.mjs
git commit -m "feat(scripts): add pure provenance check helpers + tests"
```

---

## Task 3: build-provenance.mjs CLI

**Files:**
- Create: `scripts/build-provenance.mjs`
- Create: `data/provenance-cache/.gitkeep`
- Create: `data/provenance-cache/README.md`
- Modify: `src/app/data/types.ts` (add `wikipediaTitle?: string`, `osmRef?: string` on `POI`; add `provenance: { translatedBy; lastReviewedAt }` on `POI` and `Itinerary`)
- Modify: `src/assets/pois.json` (seed `wikipediaTitle` and `osmRef` hints)

- [ ] **Step 1: Extend the POI source schema**

In `src/app/data/types.ts`, change the `POI` interface to:

```ts
export interface POI {
  id: string;
  region: 'city' | 'metro' | 'day-trip';
  category: Category;
  name: Bilingual;
  description: Bilingual;
  address: Bilingual;
  lng: number;
  lat: number;
  hours?: OpeningHours;
  pricing?: { tier: '€' | '€€' | '€€€'; rsd?: { min: number; max: number } };
  tags: string[];
  images: ImageAsset[];
  transit?: TransitInfo[];
  verifiedAt: string;
  /** Optional Wikipedia article title (English unless overridden by lang field elsewhere). */
  wikipediaTitle?: string;
  /** Optional OSM ref like 'relation/8645819' or 'way/123'. */
  osmRef?: string;
  sources: SourceRef[];
  reliability: ReliabilityScore;
  editorialConfidence: 'high' | 'medium' | 'low';
  /** Audit trail. Tells curators which translations / sources are draft vs reviewed. */
  provenance: {
    translatedBy: 'auto-draft' | 'curator';
    lastReviewedAt: string;
  };
}

export interface Itinerary {
  id: string;
  title: Bilingual;
  subtitle: Bilingual;
  durationMinutes: number;
  vibe: string[];
  stops: ItineraryStop[];
  geometryUrl: string;
  elevationProfileUrl?: string;
  bestStartHourLocal?: number;
  provenance: {
    translatedBy: 'auto-draft' | 'curator';
    lastReviewedAt: string;
  };
}
```

Run: `npx tsc --noEmit`
Expected: errors at every place that constructs `POI` or `Itinerary` literally without `provenance`.

- [ ] **Step 2: Add provenance + hint fields to all 32 POIs in pois.json**

Use a one-shot script to add `provenance` and seed `wikipediaTitle` / `osmRef` per POI. Drop in `scripts/_seed-1b1.mjs`:

```js
#!/usr/bin/env node
// One-shot, idempotent. Run once after Task 3 schema change. Delete after.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HINTS = {
  'kalemegdan':         { wikipediaTitle: 'Belgrade Fortress',     osmRef: 'relation/3818383' },
  'saint-sava':         { wikipediaTitle: 'Church of Saint Sava',  osmRef: 'way/30694022' },
  'knez-mihailova':     { wikipediaTitle: 'Knez Mihailova Street', osmRef: 'way/27733938' },
  'republic-square':    { wikipediaTitle: 'Republic Square, Belgrade', osmRef: 'way/29571502' },
  'skadarlija':         { wikipediaTitle: 'Skadarlija',            osmRef: 'way/26986050' },
  'beton-hala':         { wikipediaTitle: 'Beton Hala',            osmRef: null },
  'savamala':           { wikipediaTitle: 'Savamala',              osmRef: null },
  'cetinjska':          { wikipediaTitle: null,                    osmRef: null },
  'belgrade-waterfront':{ wikipediaTitle: 'Belgrade Waterfront',   osmRef: 'way/470011200' },
  'brankov-most':       { wikipediaTitle: 'Branko\'s Bridge',      osmRef: 'way/24981920' },
  'zoo-belgrade':       { wikipediaTitle: 'Belgrade Zoo',          osmRef: 'way/26952378' },
  'tasmajdan-park':     { wikipediaTitle: 'Tašmajdan Park',        osmRef: 'way/26977122' },
  'tesla-museum':       { wikipediaTitle: 'Nikola Tesla Museum',   osmRef: 'way/30693988' },
  'national-museum':    { wikipediaTitle: 'National Museum of Serbia', osmRef: 'way/29571504' },
  'manaks-house':       { wikipediaTitle: 'Manak\'s House',        osmRef: null },
  'bajrakli-mosque':    { wikipediaTitle: 'Bajrakli Mosque',       osmRef: 'way/26973404' },
  'princess-ljubica':   { wikipediaTitle: 'Residence of Princess Ljubica', osmRef: 'way/26973410' },
  'hotel-moskva':       { wikipediaTitle: 'Hotel Moskva',          osmRef: 'way/26973425' },
  'gardos-tower':       { wikipediaTitle: 'Gardoš Tower',          osmRef: 'way/30604516' },
  'zemun-quay':         { wikipediaTitle: 'Zemun',                 osmRef: null },
  'kafana-question-mark': { wikipediaTitle: '? (kafana)',          osmRef: 'way/26973407' },
  'magistrala':         { wikipediaTitle: null,                    osmRef: null },
  'supermarket-dorcol':  { wikipediaTitle: null,                   osmRef: null },
  'smokvica':           { wikipediaTitle: null,                    osmRef: null },
  'splavovi':           { wikipediaTitle: 'Splav (boat)',          osmRef: null },
  // Remaining POIs default to null hints; provenance still populated below.
};

const path = resolve('src/assets/pois.json');
const list = JSON.parse(readFileSync(path, 'utf8'));
const today = '2026-05-04';

for (const p of list) {
  const h = HINTS[p.id] ?? { wikipediaTitle: null, osmRef: null };
  if (h.wikipediaTitle && !p.wikipediaTitle) p.wikipediaTitle = h.wikipediaTitle;
  if (h.osmRef && !p.osmRef) p.osmRef = h.osmRef;
  if (!p.provenance) p.provenance = { translatedBy: 'auto-draft', lastReviewedAt: today };
}

writeFileSync(path, JSON.stringify(list, null, 2) + '\n');
console.log(`seeded ${list.length} POIs`);
```

Run: `node scripts/_seed-1b1.mjs`
Expected: `seeded 32 POIs`. Then delete the seed script: `rm scripts/_seed-1b1.mjs`.

- [ ] **Step 3: Add provenance to ITINERARIES literals**

In `src/app/data/itineraries.ts`, add to **each** of the 6 itinerary objects:

```ts
provenance: { translatedBy: 'auto-draft' as const, lastReviewedAt: '2026-05-04' },
```

(Place after `stops: [...],` inside each object.) Run `npx tsc --noEmit` — expect 0 errors.

- [ ] **Step 4: Write the failing CLI integration test**

`scripts/lib/build-provenance.test.mjs`:

```js
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
});
```

- [ ] **Step 5: Run; expect failure (no module yet)**

Run: `npm run test:scripts`
Expected: FAIL — `Cannot find module './build-provenance-core.mjs'`.

- [ ] **Step 6: Implement `build-provenance-core.mjs` (pure function — testable)**

`scripts/lib/build-provenance-core.mjs`:

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkWikipedia,
  checkOSM,
  checkOfficial,
  checkCrowdsourced,
  score,
  isPublishable,
} from './provenance-checks.mjs';

/**
 * Drives the four-check pipeline over every POI and writes pois.compiled.json.
 * `fetchFn` is injected so unit tests can run without network.
 */
export async function runBuildProvenance({ srcPath, outPath, cacheDir, fetchFn }) {
  const list = JSON.parse(readFileSync(srcPath, 'utf8'));
  let published = 0, failed = 0;
  const compiled = [];

  for (const poi of list) {
    const cachedSourcesPath = join(cacheDir, `${poi.id}.json`);
    const cached = existsSync(cachedSourcesPath)
      ? JSON.parse(readFileSync(cachedSourcesPath, 'utf8'))
      : { sources: [] };
    const sources = [...poi.sources, ...cached.sources];

    const wiki = await checkWikipedia(poi.wikipediaTitle, 'en', fetchFn);
    const osm = await checkOSM(poi.osmRef, fetchFn);
    const official = checkOfficial(sources);
    const crowd = checkCrowdsourced(sources);

    if (wiki.pass && wiki.url) sources.push({ kind: 'wikipedia', url: wiki.url, lang: 'en' });
    if (osm.pass) sources.push({ kind: 'osm', ref: osm.ref });

    const checks = {
      wikipedia: wiki.pass,
      osm: osm.pass,
      official: official.pass,
      crowdsourced: crowd.pass,
    };
    const reliability = { score: score(checks), checks };
    const enriched = { ...poi, sources, reliability };
    if (!isPublishable({ checks, editorialConfidence: poi.editorialConfidence })) {
      failed++;
      console.error(`✗ ${poi.id} not publishable (score ${reliability.score}, conf ${poi.editorialConfidence})`);
      continue;
    }
    published++;
    compiled.push(enriched);
  }

  writeFileSync(outPath, JSON.stringify(compiled, null, 2) + '\n');
  return { published, failed };
}
```

- [ ] **Step 7: Run tests; iterate until green**

Run: `npm run test:scripts`
Expected: All tests pass (existing 12 + 2 new).

- [ ] **Step 8: Add the CLI wrapper**

`scripts/build-provenance.mjs`:

```js
#!/usr/bin/env node
// CLI: reads src/assets/pois.json + data/provenance-cache/, writes
// src/assets/pois.compiled.json. Used by npm run build:provenance.
import { runBuildProvenance } from './lib/build-provenance-core.mjs';
import { resolve } from 'node:path';

const result = await runBuildProvenance({
  srcPath: resolve('src/assets/pois.json'),
  outPath: resolve('src/assets/pois.compiled.json'),
  cacheDir: resolve('data/provenance-cache'),
  fetchFn: globalThis.fetch,
});

console.log(`✔ published ${result.published} POIs; ${result.failed} failed publish-rule gate`);
process.exit(result.failed > 0 ? 1 : 0);
```

- [ ] **Step 9: Add the cache stub + README**

```bash
mkdir -p data/provenance-cache
touch data/provenance-cache/.gitkeep
```

`data/provenance-cache/README.md`:

```markdown
# Provenance cache

This directory holds **manually pasted** Google Places / TripAdvisor JSON for
the four-check pipeline. We never call those APIs at runtime.

## Workflow (quarterly)

For each POI you want to gate on `crowdsourced`:

1. Run a Google Places lookup; copy the JSON response.
2. Save it as `data/provenance-cache/<poi-id>.json` with this shape:

       {
         "sources": [
           { "kind": "google-places", "placeId": "ChIJ…", "reviewCount": 8421, "rating": 4.4, "checkedAt": "2026-05-04" }
         ]
       }

3. Re-run `npm run build:provenance` to refresh `pois.compiled.json`.

The cache is committed to git so the build is reproducible.
```

- [ ] **Step 10: Add npm script**

In `package.json`, under `"scripts"`:

```json
"build:provenance": "node scripts/build-provenance.mjs"
```

- [ ] **Step 11: Run end-to-end against real data**

Run: `npm run build:provenance`
Expected: stdout `✔ published 32 POIs; 0 failed publish-rule gate`. The file `src/assets/pois.compiled.json` exists and is valid JSON. (Wikipedia / OSM rate-limit politeness: the script makes one request per POI with no retry; if you get spurious 429s, run again.)

- [ ] **Step 12: Commit**

```bash
git add scripts/build-provenance.mjs scripts/lib/build-provenance-core.mjs scripts/lib/build-provenance.test.mjs data/provenance-cache/ src/app/data/types.ts src/app/data/itineraries.ts src/assets/pois.json src/assets/pois.compiled.json package.json
git commit -m "feat(scripts): add build-provenance pipeline + pois.compiled.json"
```

---

## Task 4: Switch runtime to read pois.compiled.json

**Files:**
- Modify: `src/app/data/poi.service.ts` (or wherever `pois.json` is loaded — verify location with `grep -rn pois.json src/app`)
- Modify: `ngsw-config.json`

- [ ] **Step 1: Locate the runtime fetch**

Run: `grep -rn 'pois.json' src/app/`
Note the file and line. (Likely `src/app/data/poi.service.ts` or a `loadPois()` helper.)

- [ ] **Step 2: Update the fetch URL**

In the file from Step 1, change:

```ts
fetch('assets/pois.json')
```

to:

```ts
fetch('assets/pois.compiled.json')
```

- [ ] **Step 3: Update ngsw-config.json**

Replace `/assets/pois.json` with `/assets/pois.compiled.json` in the `content` asset group's `files` array.

- [ ] **Step 4: Run unit tests**

Run: `npm test -- --watch=false`
Expected: 49/49 still passing. (Any test that mocks `pois.json` fetch now mocks `pois.compiled.json`. Update mocks if any spec uses the literal string.)

- [ ] **Step 5: Smoke-test build**

Run: `npm run build`
Expected: success, bundle within budget.

- [ ] **Step 6: Commit**

```bash
git add src/app/data/poi.service.ts ngsw-config.json
git commit -m "feat(data): runtime reads pois.compiled.json (provenance-enriched)"
```

---

## Task 5: Complete SR-Latin in pois.json (32 POIs)

**Files:**
- Modify: `src/assets/pois.json`

- [ ] **Step 1: Translate every `name.sr_lat`**

Where `name.sr_lat == name.en`, replace with the Serbian Latin form. Examples:

| `id` | `name.en` | `name.sr_lat` |
|---|---|---|
| `kalemegdan` | `Kalemegdan Fortress` | `Beogradska tvrđava (Kalemegdan)` |
| `saint-sava` | `Temple of Saint Sava` | `Hram Svetog Save` |
| `knez-mihailova` | `Knez Mihailova Street` | `Knez Mihailova` |
| `republic-square` | `Republic Square` | `Trg republike` |
| `skadarlija` | `Skadarlija` | `Skadarlija` |
| `beton-hala` | `Beton Hala` | `Beton hala` |
| `savamala` | `Savamala` | `Savamala` |
| `cetinjska` | `Cetinjska` | `Cetinjska` |
| `belgrade-waterfront` | `Belgrade Waterfront` | `Beograd na vodi` |
| `brankov-most` | `Branko's Bridge` | `Brankov most` |
| `zoo-belgrade` | `Belgrade Zoo` | `Zoološki vrt Beograd` |
| `tasmajdan-park` | `Tašmajdan Park` | `Tašmajdanski park` |
| `tesla-museum` | `Nikola Tesla Museum` | `Muzej Nikole Tesle` |
| `national-museum` | `National Museum` | `Narodni muzej Srbije` |
| `manaks-house` | `Manak's House` | `Manakova kuća` |
| `bajrakli-mosque` | `Bajrakli Mosque` | `Bajrakli džamija` |
| `princess-ljubica` | `Residence of Princess Ljubica` | `Konak kneginje Ljubice` |
| `hotel-moskva` | `Hotel Moskva` | `Hotel Moskva` |
| `gardos-tower` | `Gardoš Tower` | `Kula Sibinjanin Janka (Gardoš)` |
| `zemun-quay` | `Zemun Quay` | `Zemunski kej` |
| `kafana-question-mark` | `? (Kafana Znak Pitanja)` | `Kafana Znak pitanja (?)` |
| `magistrala` | `Magistrala` | `Magistrala` |
| `supermarket-dorcol` | `Supermarket Dorćol` | `Supermarket Dorćol` |
| `smokvica` | `Smokvica` | `Smokvica` |
| `splavovi` | `Splavovi (river clubs)` | `Splavovi` |

Translate the remaining 7 POI names (`avala`, `ada-ciganlija`, etc. — whatever the current 32 ids include) following the same convention: keep proper nouns; translate generic descriptors.

- [ ] **Step 2: Translate every `address.sr_lat`**

For each POI, where `address.sr_lat == address.en`, replace with the Serbian Latin form. Most addresses use Cyrillic-friendly Serbian Latin already (e.g. `Krušedolska 2a, Vračar` is the same in EN and SR-Latin); the translation is mostly translating generic words like `Park` → `Park` (loanword, often unchanged), `Quay` → `Kej`, `Bridge` → `Most`. Touch only the strings that contain English words.

- [ ] **Step 3: Translate every `description.sr_lat`**

This is the bulk of the content. For each POI, where `description.sr_lat == description.en`, write a Serbian Latin equivalent that preserves voice, length, and any specific recommendations. Style guidelines:
- Keep proper nouns and quoted dish names (e.g. *ćevapi*, *kajmak*) untranslated.
- Convert idioms naturally; don't translate word-for-word.
- Preserve em-dashes, ellipses, and any inline imperatives ("Look up.", "Walk the ramparts.").

If a POI's description includes a phrase you can't render fluently in Serbian, leave the EN substring in italics (Markdown-aware POI detail renders it literally, which is acceptable for v1) — flag it for the curator by appending the POI id to a list in `docs/superpowers/plans/2026-05-04-beograde-redesign-phase-1b-1-translation-notes.md`.

- [ ] **Step 4: Validate JSON**

Run: `jq '.' src/assets/pois.json > /dev/null && echo "valid"`
Expected: `valid`.

- [ ] **Step 5: Re-run provenance build**

Run: `npm run build:provenance`
Expected: `✔ published 32 POIs; 0 failed publish-rule gate`.

- [ ] **Step 6: Commit**

```bash
git add src/assets/pois.json src/assets/pois.compiled.json
git commit -m "feat(data): complete SR-Latin coverage for all 32 city POIs"
```

---

## Task 6: Complete SR-Latin in itineraries.ts

**Files:**
- Modify: `src/app/data/itineraries.ts`

- [ ] **Step 1: Translate the 5 missing subtitles**

In `src/app/data/itineraries.ts`, replace each `bg('text')` (single-arg, EN-only) with `bg('text', 'srlat')`:

| id | Current `subtitle` | New SR-Latin |
|---|---|---|
| `foodie-crawl` | `Coffee, brunch, kafana, cake, late drinks.` | `Kafa, brunch, kafana, kolač, pića do kasno.` |
| `riverside-splavovi` | `Walk the Sava, eat by the water, dance on it.` | `Šetnja pored Save, večera kraj vode, ples na njoj.` |
| `family-day` | `Big space, small queues, ice cream stops.` | `Mnogo prostora, kratki redovi, sladoled između.` |
| `rainy-day` | `Two great museums, two great cafés, no umbrella drama.` | `Dva sjajna muzeja, dva sjajna kafića, bez kišobranske gužve.` |
| `viewpoint-sunset` | `Catch Belgrade from above, water-level, and across the Sava.` | `Vidi Beograd odozgo, sa vode i sa druge strane Save.` |

- [ ] **Step 2: Translate every `notes` on stops**

For each `notes: bg('text')` in any itinerary's `stops`, replace with `notes: bg('text', 'srlat')`. Examples:

```ts
notes: bg('Start at the upper town. Find the Victor monument.', 'Kreni od gornjeg grada. Pronađi Pobednika.')
notes: bg('Ćevapi and a half-litre of beer.', 'Ćevapi i pola litra piva.')
notes: bg('Flat white to start.', 'Flat white za početak.')
notes: bg('Late brunch in the courtyard.', 'Kasni brunch u dvorištu.')
notes: bg('Moskva Šnit and a coffee.', 'Moskva šnit i kafa.')
notes: bg('Kafana dinner with live tamburica.', 'Kafanska večera uz tamburu uživo.')
notes: bg('Last drink in the courtyard.', 'Poslednje piće u dvorištu.')
notes: bg('Sunset shot from the bridge.', 'Zalazak sa mosta.')
notes: bg('Long dinner, watch the lights come on.', 'Duga večera, dok se pale svetla.')
notes: bg('Pre-game drinks in a gallery bar.', 'Piće pre izlaska u galerijskom baru.')
notes: bg('Pick a splav by the music spilling out.', 'Biraj splav po muzici koja se širi napolje.')
notes: bg('Ice cream and a street performer.', 'Sladoled i ulični umetnik.')
notes: bg('Time the coil demo.', 'Tempiraj demonstraciju Tesline kalemove.')
notes: bg('Upper-town walls, golden hour.', 'Bedemi gornjeg grada, zlatni sat.')
notes: bg('Climb for the final viewpoint.', 'Popni se do poslednjeg vidikovca.')
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/data/itineraries.ts
git commit -m "feat(data): complete SR-Latin coverage for itinerary subtitles + stop notes"
```

---

## Task 7: Latin → Cyrillic transliteration helper (TDD)

**Files:**
- Create: `scripts/lib/translit.mjs`
- Create: `scripts/lib/translit.test.mjs`

- [ ] **Step 1: Write the failing tests**

`scripts/lib/translit.test.mjs`:

```js
import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { latnToCyrl, cyrlToLatn, roundTripsCleanly } from './translit.mjs';

describe('latnToCyrl basic letters', () => {
  test('one-to-one ASCII letters map to Cyrillic', () => {
    assert.equal(latnToCyrl('Beograd'), 'Београд');
    assert.equal(latnToCyrl('Sava'), 'Сава');
    assert.equal(latnToCyrl('TRG'), 'ТРГ');
  });

  test('Serbian-specific single letters', () => {
    assert.equal(latnToCyrl('Šabac'), 'Шабац');
    assert.equal(latnToCyrl('Čačak'), 'Чачак');
    assert.equal(latnToCyrl('Žaba'), 'Жаба');
    assert.equal(latnToCyrl('ćevap'), 'ћевап');
    assert.equal(latnToCyrl('đak'), 'ђак');
  });
});

describe('latnToCyrl digraphs (the tricky part)', () => {
  test('lowercase digraphs', () => {
    assert.equal(latnToCyrl('ljubav'), 'љубав');
    assert.equal(latnToCyrl('njegov'), 'његов');
    assert.equal(latnToCyrl('džak'), 'џак');
  });

  test('title-cased digraph: only the first letter capitalised → њ-style single Cyrillic capital', () => {
    assert.equal(latnToCyrl('Ljubav'), 'Љубав');
    assert.equal(latnToCyrl('Njegov'), 'Његов');
  });

  test('ALL-CAPS digraph: both letters capitalised → ЊЕГОВ', () => {
    assert.equal(latnToCyrl('LJUBAV'), 'ЉУБАВ');
    assert.equal(latnToCyrl('NJEGOV'), 'ЊЕГОВ');
    assert.equal(latnToCyrl('DŽAK'), 'ЏАК');
  });

  test('digraph false-friend: \"nje\" inside a non-digraph context still translates as њ + е', () => {
    // Pure Serbian: "konjac" → "коњац". This is a deliberate property of the
    // table — round-trip QA will catch foreign words that should NOT collapse.
    assert.equal(latnToCyrl('konjac'), 'коњац');
  });
});

describe('cyrlToLatn round-trip', () => {
  test('Beograd round-trips', () => {
    assert.equal(cyrlToLatn(latnToCyrl('Beograd')), 'Beograd');
  });

  test('digraphs round-trip', () => {
    assert.equal(cyrlToLatn(latnToCyrl('ljubav')), 'ljubav');
    assert.equal(cyrlToLatn(latnToCyrl('NJEGOV')), 'NJEGOV');
  });
});

describe('roundTripsCleanly', () => {
  test('returns true for a clean Serbian string', () => {
    assert.equal(roundTripsCleanly('Beograd na vodi'), true);
  });

  test('returns true for a foreign loanword whose chars all pass through', () => {
    // "München" — `ü` is not in the table and passes through both directions,
    // so the string round-trips cleanly. Documented as a property of the
    // table so reviewers don't expect non-Latin chars to fail the gate.
    assert.equal(roundTripsCleanly('München'), true);
  });

  test('returns false when input is accidentally already Cyrillic (sanity guard)', () => {
    // The QA gate's real job: catch when sr-Latn source accidentally contains
    // Cyrillic. latnToCyrl is a no-op on Cyrillic, but cyrlToLatn collapses it
    // to Latin, so the round-trip diverges.
    assert.equal(roundTripsCleanly('Знак питања'), false);
  });
});

describe('passthroughs', () => {
  test('digits unchanged', () => {
    assert.equal(latnToCyrl('Knez Mihailova 24'), 'Кнез Михаилова 24');
  });
  test('punctuation and whitespace unchanged', () => {
    assert.equal(latnToCyrl('Beograd, Srbija!'), 'Београд, Србија!');
  });
});
```

- [ ] **Step 2: Run; expect failure**

Run: `npm run test:scripts`
Expected: FAIL (`./translit.mjs` missing).

- [ ] **Step 3: Implement the table**

`scripts/lib/translit.mjs`:

```js
// Deterministic Serbian Latin → Cyrillic transliteration. The trick is that
// "lj", "nj", "dž" are digraphs in Latin but single letters in Cyrillic. We
// replace longest-first to avoid collisions with the single-letter table.

const DIGRAPHS = [
  ['Lj', 'Љ'], ['LJ', 'Љ'], ['lj', 'љ'],
  ['Nj', 'Њ'], ['NJ', 'Њ'], ['nj', 'њ'],
  ['Dž', 'Џ'], ['DŽ', 'Џ'], ['dž', 'џ'],
];

const SINGLES = {
  'A':'А','B':'Б','V':'В','G':'Г','D':'Д','Đ':'Ђ','E':'Е','Ž':'Ж',
  'Z':'З','I':'И','J':'Ј','K':'К','L':'Л','M':'М','N':'Н','O':'О',
  'P':'П','R':'Р','S':'С','T':'Т','Ć':'Ћ','U':'У','F':'Ф','H':'Х',
  'C':'Ц','Č':'Ч','Š':'Ш',
  'a':'а','b':'б','v':'в','g':'г','d':'д','đ':'ђ','e':'е','ž':'ж',
  'z':'з','i':'и','j':'ј','k':'к','l':'л','m':'м','n':'н','o':'о',
  'p':'п','r':'р','s':'с','t':'т','ć':'ћ','u':'у','f':'ф','h':'х',
  'c':'ц','č':'ч','š':'ш',
};

const SINGLES_INVERSE = Object.fromEntries(
  Object.entries(SINGLES).map(([latn, cyrl]) => [cyrl, latn]),
);

const DIGRAPHS_INVERSE = [
  ['Љ', 'Lj'], ['љ', 'lj'],
  ['Њ', 'Nj'], ['њ', 'nj'],
  ['Џ', 'Dž'], ['џ', 'dž'],
];

export function latnToCyrl(input) {
  let out = input;
  for (const [latn, cyrl] of DIGRAPHS) {
    out = out.replaceAll(latn, cyrl);
  }
  let result = '';
  for (const ch of out) {
    result += SINGLES[ch] ?? ch;
  }
  return result;
}

export function cyrlToLatn(input) {
  let out = input;
  // Apply digraphs first (longest matches), but in Cyrillic each is a single
  // codepoint so the order doesn't matter for collisions — it's purely for
  // symmetry with latnToCyrl.
  for (const [cyrl, latn] of DIGRAPHS_INVERSE) {
    out = out.replaceAll(cyrl, latn);
  }
  let result = '';
  for (const ch of out) {
    result += SINGLES_INVERSE[ch] ?? ch;
  }
  return result;
}

export function roundTripsCleanly(latn) {
  return cyrlToLatn(latnToCyrl(latn)) === latn;
}
```

- [ ] **Step 4: Run; iterate until green**

Run: `npm run test:scripts`
Expected: All translit tests pass. (One subtle test: `Ljubav → Љубав` requires the `Lj` digraph to come before `LJ` and `lj` in the array; verify the table uses longest-first or distinct uppercase variants — the implementation above lists all three explicitly.)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/translit.mjs scripts/lib/translit.test.mjs
git commit -m "feat(scripts): add deterministic Serbian Latin↔Cyrillic transliteration"
```

---

## Task 8: SR-Cyrillic override file + scaffolding

**Files:**
- Create: `src/i18n/sr-cyr-overrides.json`

- [ ] **Step 1: Add the overrides file**

`src/i18n/sr-cyr-overrides.json`:

```json
{
  "_doc": "Manual overrides for Latin→Cyrillic translit. Keys are dot-paths into sr-Latn.json (e.g. 'settings.install_ios'). Values are the explicit Cyrillic forms. Used when the deterministic table produces something wrong — typically loanwords (Wi-Fi, café names) and trademarks. Run `npm run build:i18n` to apply."
}
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/sr-cyr-overrides.json
git commit -m "feat(i18n): add sr-cyr-overrides.json scaffold"
```

---

## Task 9: build-i18n.mjs — generate sr-Cyrl.json with QA

**Files:**
- Create: `scripts/build-i18n.mjs`
- Create: `scripts/lib/build-i18n-core.mjs`
- Create: `scripts/lib/build-i18n.test.mjs`
- Create: `src/i18n/sr-Cyrl.json` (output, generated)
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

`scripts/lib/build-i18n.test.mjs`:

```js
import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { runBuildI18n } from './build-i18n-core.mjs';

describe('build-i18n', () => {
  test('translates a clean nested object', async () => {
    const srLatn = { tabs: { home: 'Početna', map: 'Mapa' }, common: { close: 'Zatvori' } };
    const overrides = {};
    const { output, warnings } = await runBuildI18n({ srLatn, overrides });
    assert.equal(output.tabs.home, 'Почетна');
    assert.equal(output.tabs.map, 'Мапа');
    assert.equal(output.common.close, 'Затвори');
    assert.equal(warnings.length, 0);
  });

  test('applies an override entry for a specific key path', async () => {
    const srLatn = { foo: { bar: 'WiFi' } };
    const overrides = { 'foo.bar': 'Вај-Фај' };
    const { output, warnings } = await runBuildI18n({ srLatn, overrides });
    assert.equal(output.foo.bar, 'Вај-Фај');
    assert.equal(warnings.length, 0);
  });

  test('emits a warning when input is accidentally Cyrillic (script-mismatch guard)', async () => {
    const srLatn = { tagline: 'Београд' };  // accidental Cyrillic in sr-Latn source
    const overrides = {};
    const { warnings } = await runBuildI18n({ srLatn, overrides });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /tagline/);
  });

  test('skips _doc keys at any depth', async () => {
    const srLatn = { _doc: 'ignored' };
    const overrides = { _doc: 'also ignored' };
    const { output } = await runBuildI18n({ srLatn, overrides });
    assert.equal(output._doc, undefined);
  });
});
```

- [ ] **Step 2: Run; expect failure**

Run: `npm run test:scripts`
Expected: FAIL (`./build-i18n-core.mjs` missing).

- [ ] **Step 3: Implement the core**

`scripts/lib/build-i18n-core.mjs`:

```js
import { latnToCyrl, roundTripsCleanly } from './translit.mjs';

/**
 * Walk every leaf in srLatn, transliterate, apply overrides, collect warnings.
 * Returns { output, warnings }. Does not touch the filesystem.
 */
export async function runBuildI18n({ srLatn, overrides }) {
  const warnings = [];
  function walk(obj, path) {
    if (typeof obj === 'string') {
      const overrideKey = path.join('.');
      if (overrides[overrideKey] !== undefined) return overrides[overrideKey];
      const cyrl = latnToCyrl(obj);
      if (!roundTripsCleanly(obj)) warnings.push(`${overrideKey}: \"${obj}\" does not round-trip cleanly; add override`);
      return cyrl;
    }
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === '_doc') continue;
        out[k] = walk(v, [...path, k]);
      }
      return out;
    }
    return obj;
  }
  return { output: walk(srLatn, []), warnings };
}
```

- [ ] **Step 4: Run; iterate until green**

Run: `npm run test:scripts`
Expected: 4 build-i18n tests passing.

- [ ] **Step 5: Add the CLI**

`scripts/build-i18n.mjs`:

```js
#!/usr/bin/env node
// CLI: reads src/i18n/sr-Latn.json and src/i18n/sr-cyr-overrides.json,
// writes src/i18n/sr-Cyrl.json. Fails the build if any string does not
// round-trip and has no override.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runBuildI18n } from './lib/build-i18n-core.mjs';

const srLatn = JSON.parse(readFileSync(resolve('src/i18n/sr-Latn.json'), 'utf8'));
const overrides = JSON.parse(readFileSync(resolve('src/i18n/sr-cyr-overrides.json'), 'utf8'));

const { output, warnings } = await runBuildI18n({ srLatn, overrides });

if (warnings.length > 0) {
  for (const w of warnings) console.warn(`! ${w}`);
  console.error(`✗ ${warnings.length} string(s) do not round-trip cleanly. Add override entries to src/i18n/sr-cyr-overrides.json.`);
  process.exit(1);
}

writeFileSync(resolve('src/i18n/sr-Cyrl.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`✔ wrote src/i18n/sr-Cyrl.json (${Object.keys(output).length} top-level groups)`);
```

- [ ] **Step 6: Add npm script**

In `package.json`:

```json
"build:i18n": "node scripts/build-i18n.mjs"
```

- [ ] **Step 7: Generate sr-Cyrl.json**

Run: `npm run build:i18n`
Expected: `✔ wrote src/i18n/sr-Cyrl.json`. If warnings appear, add override entries to `sr-cyr-overrides.json` and re-run until clean. (Likely candidates: `settings.language_en` = `English` shouldn't transliterate, add override `"settings.language_en": "English"`.)

- [ ] **Step 8: Commit**

```bash
git add scripts/build-i18n.mjs scripts/lib/build-i18n-core.mjs scripts/lib/build-i18n.test.mjs src/i18n/sr-Cyrl.json src/i18n/sr-cyr-overrides.json package.json
git commit -m "feat(i18n): generate sr-Cyrl.json from sr-Latn + overrides with round-trip QA"
```

---

## Task 10: Auto-translit POI sr_cyr fields in build-provenance

**Files:**
- Modify: `scripts/lib/build-provenance-core.mjs`
- Modify: `scripts/lib/build-provenance.test.mjs`

- [ ] **Step 1: Add a failing test**

Append to `scripts/lib/build-provenance.test.mjs`:

```js
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
```

- [ ] **Step 2: Run; expect failure**

Run: `npm run test:scripts`
Expected: FAIL — assertion fails because `sr_cyr` is still empty.

- [ ] **Step 3: Wire translit into the core**

In `scripts/lib/build-provenance-core.mjs`, add at the top:

```js
import { latnToCyrl } from './translit.mjs';

function fillCyr(b) {
  if (b.sr_cyr) return b;
  return { ...b, sr_cyr: latnToCyrl(b.sr_lat || b.en || '') };
}
```

Inside the `for (const poi of list)` loop, before `const enriched = ...`, add:

```js
poi.name = fillCyr(poi.name);
poi.description = fillCyr(poi.description);
poi.address = fillCyr(poi.address);
if (poi.hours?.notes) poi.hours.notes = fillCyr(poi.hours.notes);
```

- [ ] **Step 4: Run; iterate until green**

Run: `npm run test:scripts`
Expected: all build-provenance tests pass.

- [ ] **Step 5: Re-run real build**

Run: `npm run build:provenance`
Expected: `✔ published 32 POIs`. Spot-check a record in `src/assets/pois.compiled.json`:

```bash
jq '.[0].name' src/assets/pois.compiled.json
```

Should now show non-empty `sr_cyr`.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-provenance-core.mjs scripts/lib/build-provenance.test.mjs src/assets/pois.compiled.json
git commit -m "feat(scripts): auto-fill sr_cyr POI fields via Latin→Cyrillic translit"
```

---

## Task 11: StringsService — consolidate locale-aware UI strings

**Files:**
- Create: `src/app/core/i18n/strings.service.ts`
- Create: `src/app/core/i18n/strings.service.spec.ts`
- Modify: `src/app/app.ts`, plus `saved.component.ts`, `settings.component.ts`, `home.component.ts`, `poi-detail.component.ts`, `map.component.ts`, `poi-list.component.ts`, `itinerary-detail.component.ts`, `itinerary-list.component.ts`, `trips.component.ts`

- [ ] **Step 1: Write the failing service spec**

`src/app/core/i18n/strings.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { StringsService } from './strings.service';
import { I18nService } from './i18n.service';

describe('StringsService', () => {
  let svc: StringsService;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(StringsService);
    i18n = TestBed.inject(I18nService);
  });

  it('returns EN when locale is en', () => {
    i18n.locale.set({ locale: 'en', script: 'Latn' });
    expect(svc.t().tabs.home).toBe('Home');
  });

  it('returns SR-Latn when locale is sr/Latn', () => {
    i18n.locale.set({ locale: 'sr', script: 'Latn' });
    expect(svc.t().tabs.home).toBe('Početna');
  });

  it('returns SR-Cyrl when locale is sr/Cyrl AND cyrillicEnabled is true', () => {
    // We bypass setLocale here because it clamps Cyrl→Latn while CYRILLIC_ENABLED
    // is still the Phase-1a default. Setting the signal directly exercises the
    // StringsService branch we're testing — Task 12 flips the constant later.
    i18n.cyrillicEnabled.set(true);
    i18n.locale.set({ locale: 'sr', script: 'Cyrl' });
    expect(svc.t().tabs.home).toBe('Почетна');
  });

  it('falls back to SR-Latn when script is Cyrl but cyrillicEnabled is false', () => {
    i18n.cyrillicEnabled.set(false);
    i18n.locale.set({ locale: 'sr', script: 'Cyrl' });
    expect(svc.t().tabs.home).toBe('Početna');
  });
});
```

- [ ] **Step 2: Run tests; expect failure**

Run: `npm test -- --watch=false`
Expected: FAIL — `Cannot find module './strings.service'`.

- [ ] **Step 3: Implement StringsService**

`src/app/core/i18n/strings.service.ts`:

```ts
import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';
import srCyrStrings from '../../../i18n/sr-Cyrl.json';

type StringsBundle = typeof enStrings;

@Injectable({ providedIn: 'root' })
export class StringsService {
  private readonly i18n = inject(I18nService);
  readonly t = computed<StringsBundle>(() => {
    const loc = this.i18n.locale();
    if (loc.locale !== 'sr') return enStrings;
    if (loc.script === 'Cyrl' && this.i18n.cyrillicEnabled()) return srCyrStrings as StringsBundle;
    return srLatStrings as StringsBundle;
  });
}
```

- [ ] **Step 4: Run tests; expect green for StringsService spec**

Run: `npm test -- --watch=false`
Expected: 4 new tests pass; existing 49 still pass.

- [ ] **Step 5: Refactor `app.ts`**

In `src/app/app.ts`, remove:

```ts
import enStrings from '../i18n/en.json';
import srLatStrings from '../i18n/sr-Latn.json';
```

Add:

```ts
import { StringsService } from './core/i18n/strings.service';
```

Replace the existing `t` computed (the one with the `srLatStrings.tabs / enStrings.tabs` ternary) with:

```ts
private readonly strings = inject(StringsService);
protected readonly tabs = computed(() => {
  const t = this.strings.t().tabs;
  return [
    { id: 'home', label: t.home, icon: 'home', route: '/home' },
    { id: 'map', label: t.map, icon: 'map', route: '/map' },
    { id: 'routes', label: t.routes, icon: 'route', route: '/routes' },
    { id: 'trips', label: t.trips, icon: 'directions_train', route: '/trips' },
    { id: 'saved', label: t.saved, icon: 'bookmark', route: '/saved' },
  ];
});
```

- [ ] **Step 6: Refactor each remaining component (9 files)**

For each of `saved.component.ts`, `settings.component.ts`, `home.component.ts`, `poi-detail.component.ts`, `map.component.ts`, `poi-list.component.ts`, `itinerary-detail.component.ts`, `itinerary-list.component.ts`, `trips.component.ts`:

- Remove the two static imports of `enStrings` / `srLatStrings`.
- Add `import { StringsService } from '../../core/i18n/strings.service';` (adjust depth).
- Replace `protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);` with:
  ```ts
  private readonly strings = inject(StringsService);
  protected readonly t = this.strings.t;
  ```
- If a component uses `this.t().<group>` in templates, the call signature is unchanged.

- [ ] **Step 7: Run unit tests + build + lint**

Run: `npm test -- --watch=false`
Expected: 53/53 passing.

Run: `npm run lint`
Expected: 0 errors.

Run: `npm run build`
Expected: success, bundle within budget.

- [ ] **Step 8: Commit**

```bash
git add src/app/core/i18n/strings.service.ts src/app/core/i18n/strings.service.spec.ts src/app/app.ts src/app/features/
git commit -m "refactor(i18n): consolidate locale-aware UI strings into StringsService"
```

---

## Task 12: Activate Cyrillic toggle

**Files:**
- Modify: `src/app/core/i18n/i18n.service.ts`
- Modify: `src/app/features/settings/settings.component.html` (verify the script picker is wired)
- Modify: `src/app/core/i18n/i18n.service.spec.ts`

- [ ] **Step 1: Flip the flag**

In `src/app/core/i18n/i18n.service.ts`:

```ts
const CYRILLIC_ENABLED = true;
```

Remove the early-return clamp inside `setLocale` that forces `script: 'Latn'`:

```ts
setLocale(next: ResolvedLocale): void {
  // Phase 1b: cyrillicEnabled defaults true, no clamping.
  this.locale.set(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode etc. — silent.
  }
}
```

- [ ] **Step 2: Update the existing service spec to cover Cyrillic**

In `src/app/core/i18n/i18n.service.spec.ts`, add:

```ts
it('persists Cyrillic script when cyrillic is enabled', () => {
  svc.setLocale({ locale: 'sr', script: 'Cyrl' });
  expect(svc.locale().script).toBe('Cyrl');
});
```

- [ ] **Step 3: Verify Settings UI exposes the script picker**

Read `src/app/features/settings/settings.component.html`. There should already be a language toggle (added in Phase 1a). Verify it cycles through three states `en/Latn`, `sr/Latn`, `sr/Cyrl`. If only two states exist, extend the cycle: when current is `sr/Latn`, next is `sr/Cyrl`; when current is `sr/Cyrl`, next is `en/Latn`.

The label for `sr/Cyrl` is `t.settings.language_sr_cyr` — add this key to all three of `src/i18n/en.json`, `src/i18n/sr-Latn.json` (`Srpski (ћирилица)`); regenerate `sr-Cyrl.json` via `npm run build:i18n`.

- [ ] **Step 4: Run all tests**

Run: `npm test -- --watch=false`
Expected: all green (54+).

- [ ] **Step 5: Manual verification**

Run: `npm run build`, then `npm start` and open `http://localhost:3000/settings`. Click the language toggle three times — confirm `Home / Početna / Почетна` cycle on the Home tab.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/i18n/ src/app/features/settings/ src/i18n/en.json src/i18n/sr-Latn.json src/i18n/sr-Cyrl.json
git commit -m "feat(i18n): activate Cyrillic UI toggle (sr/Cyrl)"
```

---

## Task 13: Document the build chain

**Files:**
- Modify: `scripts/README.md`
- Modify: `package.json`

- [ ] **Step 1: Add prebuild + chain script**

In `package.json`, under `"scripts"`:

```json
"build:content": "npm run build:provenance && npm run build:i18n",
"prebuild": "npm run build:content"
```

- [ ] **Step 2: Update scripts/README.md**

Append a new section:

```markdown
## Content pipelines (Phase 1b.1)

| Script | Inputs | Output | When to run |
|---|---|---|---|
| `build-provenance.mjs` | `src/assets/pois.json` + `data/provenance-cache/<id>.json` (optional) | `src/assets/pois.compiled.json` | Whenever POI source data changes. Fails on any unpublishable POI. |
| `build-i18n.mjs` | `src/i18n/sr-Latn.json` + `src/i18n/sr-cyr-overrides.json` | `src/i18n/sr-Cyrl.json` | Whenever SR-Latin strings change. Fails on any non-clean round-trip without an override. |

Both run as part of `npm run build` via the `prebuild` lifecycle hook.

Manual:

    npm run build:provenance
    npm run build:i18n
    # or both
    npm run build:content
```

- [ ] **Step 3: Verify the prebuild chain runs**

Run: `npm run build`
Expected: `build:provenance` and `build:i18n` both run before `ng build`; output ends with the production bundle summary, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/README.md
git commit -m "docs(scripts): document content pipelines + wire prebuild chain"
```

---

## Merge readiness

PR #2 (`feat/phase-1a-redesign` → `main`) must be reviewed/merged before this branch's PR opens — both touch the same i18n files and the data layer. The flow:

1. Address any review feedback on PR #2; merge it into `main`.
2. On `feat/phase-1b-redesign`, run:
   ```bash
   git fetch origin
   git rebase origin/main
   # resolve any conflicts (likely in src/app/data/types.ts or src/i18n/sr-Latn.json)
   npm test -- --watch=false
   npm run lint
   npm run build
   ```
3. Smoke-test in the browser: language cycle EN → SR-Latin → SR-Cyrillic on the Home tab; tap a POI; confirm name/description/address render in the chosen script.
4. `git push -u origin feat/phase-1b-redesign --force-with-lease`
5. `gh pr create --base main --head feat/phase-1b-redesign --title "feat: Phase 1b.1 — content pipelines + SR-Latin + Cyrillic activation" ...`

---

## Spec coverage matrix

| Spec section / requirement | Task |
|---|---|
| §8 Wikipedia / OSM / Official / Crowdsourced checks | Task 2 |
| §8 Score = 25 × passing checks | Task 2 |
| §8 Publish rule (`(wiki ∨ osm ∨ official) ∨ editorialConfidence='high'`) | Task 2, 3 |
| §8 `scripts/build-provenance.mjs` emits `pois.compiled.json` | Task 3 |
| §8 Build fails if a POI is not publishable | Task 3 |
| §8 No live API calls — Google Places via `data/provenance-cache/<id>.json` | Task 3 |
| §12 Auto-transliterate every string from sr_lat to sr_cyr | Tasks 7, 9, 10 |
| §12 Manual override file at `src/i18n/sr-cyr-overrides.json` | Task 8 |
| §12 Build-time round-trip QA, fails on unclean round-trips | Task 9 |
| §12 No fallback chain — every string has all three forms | Task 9 (build fails otherwise) |
| §12 Phase 1b enables Cyrillic when override file is reviewed | Task 12 |
| §13 Image pipeline | **Deferred to Phase 1b.2** |
| Phase-1a smoke-test gap: 5/6 itinerary subtitles fall back to EN | Task 6 (and Task 5 catches the wider gap on POIs) |

---

## Notes for the executor

- The plan introduces `npm run test:scripts` alongside `npm test -- --watch=false`. Both must pass before any commit. The auto-memory entry `npm test -- --watch=false` (not `--run`) still applies for the Angular suite.
- All build scripts use Node 22+ built-ins (`fetch`, `node:test`); no new npm dependencies in this slice.
- If a Wikipedia or Overpass request rate-limits during `npm run build:provenance`, re-run — there's no retry logic intentionally (we want to know when the public APIs are flaky so the curator can decide whether to add an entry to `data/provenance-cache/<id>.json`).
- If you discover during translation (Tasks 5, 6) that a Serbian translation feels awkward or lossy, leave the EN substring inline (Markdown-safe) and append the POI/itinerary id to a translation-followups list at the **bottom of this plan file** — do not block the slice on prose perfection.
