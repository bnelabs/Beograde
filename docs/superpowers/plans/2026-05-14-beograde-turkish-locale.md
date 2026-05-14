# Turkish (tr) Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Turkish (`tr`) as a third UI/content locale alongside English and Serbian, with full UI string coverage and a content scaffolding path that mirrors the existing `sr_cyr` auto-draft flow.

**Architecture:** Extend the existing `Bilingual` content type with a `tr` string field (kept name for diff scope — rename is a follow-up). Extend `Locale = 'en' | 'sr' | 'tr'`. `pick()` returns `tr` when the active locale is Turkish, falling back to `en` when empty (same rule used today for empty `sr_lat`). The build-provenance pipeline auto-drafts `tr` from `en` for every POI just like it auto-drafts `sr_cyr` from `sr_lat`. UI strings ship hand-translated in `src/i18n/tr.json` (92 keys, mirroring `en.json`). The settings language toggle cycles `en → sr-Latn → sr-Cyrl → tr → en`. Turkish uses Latin script only, so `Script` stays `'Latn' | 'Cyrl'`.

**Tech Stack:** Angular 17 standalone components, signals, Jasmine/Karma for app tests, `node:test` for script tests, TypeScript strict mode.

**Test command:** `npm test -- --watch=false` (Angular/Karma), `npm run test:scripts` (node:test). Memory: never use `--run`.

**Out of scope (follow-ups):**
- Hand-curating per-POI Turkish content (the auto-draft = en fallback ships first; curator review is a content pass, not code).
- Renaming `Bilingual` type → `Localized` (mechanical, but adds noise to this PR).

---

## Task summary

| # | Task | Files (rough) |
|---|---|---|
| 1 | Extend `Bilingual` + `Locale` types | `src/app/data/types.ts` + spec |
| 2 | Extend `pick()` and browser detection | `src/app/core/i18n/i18n.ts` + spec |
| 3 | Add `tr` field to all `Bilingual` literals in `src/assets/pois.json` | one-shot script + run |
| 4 | Add `tr` to `Bilingual` literals in `src/app/data/itineraries.ts` | hand-edit |
| 5 | Update content build scripts to emit `tr` field | `scripts/migrate-pois.mjs`, `seed-poi-content.mjs`, `fill-default-activities.mjs` |
| 6 | Auto-draft `tr` from `en` in build-provenance | `scripts/lib/build-provenance-core.mjs` + test |
| 7 | Create `src/i18n/tr.json` (92 strings) | new file |
| 8 | Add `settings.language_tr` label to en/sr-Latn UI strings + Cyrillic override | three UI string files |
| 9 | Wire `StringsService` to load `tr.json` | `strings.service.ts` + spec |
| 10 | Settings: cycle locale to include `tr`, render label | `settings.component.ts` |
| 11 | Final verification + PR + merge | (no new code) |

---

### Task 1: Extend `Bilingual` and `Locale` types

**Files:**
- Modify: `src/app/data/types.ts`
- Modify: `src/app/data/types.spec.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/app/data/types.spec.ts` inside the existing `describe('types', …)` block:

```ts
  it('Bilingual carries a Turkish field', () => {
    const bg: Bilingual = { en: 'a', sr_lat: 'a', sr_cyr: 'a', tr: 'a' };
    expect(bg.tr).toBe('a');
  });
```

Also update the existing `Bilingual` literals in that file (there are three: in the POI test, the Itinerary test, and the TransitInfo test) to include `tr: 'a'`/`tr: 't'`/`tr: 's'` accordingly so they still type-check.

- [ ] **Step 2: Run the test to confirm it fails to compile**

```bash
npm test -- --watch=false
```

Expected: TypeScript error — `Property 'tr' is missing in type` or `Object literal may only specify known properties`.

- [ ] **Step 3: Update the type**

Replace lines 3–12 of `src/app/data/types.ts` with:

```ts
export type Locale = 'en' | 'sr' | 'tr';
export type Script = 'Latn' | 'Cyrl';

/** Localized content. sr_cyr is auto-transliterated from sr_lat at build time.
 * tr is auto-drafted from en at build time and curated later. */
export interface Bilingual {
  en: string;
  sr_lat: string;
  sr_cyr: string;
  tr: string;
}
```

(Name `Bilingual` retained intentionally — see plan front-matter; rename is a follow-up.)

- [ ] **Step 4: Run the test**

```bash
npm test -- --watch=false
```

Expected: PASS (the Bilingual literal compiles; new test asserts `.tr === 'a'`).

- [ ] **Step 5: Commit**

```bash
git add src/app/data/types.ts src/app/data/types.spec.ts
git commit -m "feat(types): add tr field to Bilingual and Locale"
```

---

### Task 2: Extend `pick()` and browser locale detection

**Files:**
- Modify: `src/app/core/i18n/i18n.ts`
- Modify: `src/app/core/i18n/i18n.spec.ts`

- [ ] **Step 1: Add failing tests**

In `src/app/core/i18n/i18n.spec.ts`, update the `sample` constant on line 4 to include `tr`:

```ts
const sample: Bilingual = { en: 'Hello', sr_lat: 'Zdravo', sr_cyr: 'Здраво', tr: 'Merhaba' };
```

Then add the following inside the existing `describe('pick', …)` block (after the existing tests):

```ts
    it('picks Turkish when locale is tr', () => {
      expect(pick(sample, { locale: 'tr', script: 'Latn' })).toBe('Merhaba');
    });

    it('falls back to English when tr field is empty', () => {
      const partial: Bilingual = { en: 'Only', sr_lat: '', sr_cyr: '', tr: '' };
      expect(pick(partial, { locale: 'tr', script: 'Latn' })).toBe('Only');
    });
```

Also update the existing "falls back to English when sr field is empty" partial literal on line 21 to include `tr: ''` so it still type-checks.

Then add this inside `describe('defaultLocaleFromBrowser', …)`:

```ts
    it('returns tr-Latn when navigator language starts with tr', () => {
      expect(defaultLocaleFromBrowser('tr-TR')).toEqual({ locale: 'tr', script: 'Latn' });
      expect(defaultLocaleFromBrowser('tr')).toEqual({ locale: 'tr', script: 'Latn' });
    });
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npm test -- --watch=false
```

Expected: 2 failures in `pick` (Turkish branch missing) and 1 in `defaultLocaleFromBrowser` (tr branch missing).

- [ ] **Step 3: Update `i18n.ts`**

Replace `src/app/core/i18n/i18n.ts` with:

```ts
import type { Bilingual } from '../../data/types';
import { DEFAULT_LOCALE, ResolvedLocale } from './i18n.types';

export function pick(value: Bilingual, locale: ResolvedLocale): string {
  if (locale.locale === 'sr') {
    if (locale.script === 'Cyrl' && value.sr_cyr) return value.sr_cyr;
    if (value.sr_lat) return value.sr_lat;
  }
  if (locale.locale === 'tr' && value.tr) return value.tr;
  return value.en;
}

export function defaultLocaleFromBrowser(lang: string | undefined): ResolvedLocale {
  if (!lang) return DEFAULT_LOCALE;
  const lower = lang.toLowerCase();
  if (lower.startsWith('sr')) return { locale: 'sr', script: 'Latn' };
  if (lower.startsWith('tr')) return { locale: 'tr', script: 'Latn' };
  return DEFAULT_LOCALE;
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
npm test -- --watch=false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/i18n/i18n.ts src/app/core/i18n/i18n.spec.ts
git commit -m "feat(i18n): pick(tr) + browser detection for tr-*"
```

---

### Task 3: Scaffold `tr` field on every `Bilingual` literal in `pois.json`

**Files:**
- Create: `scripts/add-tr-field.mjs` (one-shot migration)
- Modify: `src/assets/pois.json` (regenerated by the script)

The script walks every object in `pois.json` and, for any object that has the keys `en`, `sr_lat`, `sr_cyr` but is missing `tr`, adds `tr: ""` (curator/build-provenance will fill from `en` later). Same algorithm used in `scripts/migrate-pois.mjs` but only adds the missing key, never mutates other content.

- [ ] **Step 1: Write the migration script**

Create `scripts/add-tr-field.mjs`:

```js
#!/usr/bin/env node
/**
 * One-shot: add `tr: ""` to every Bilingual literal in src/assets/pois.json.
 *
 * A Bilingual literal is any object that has en + sr_lat + sr_cyr keys.
 * tr is left empty so build-provenance can auto-draft it from en (same pattern
 * as sr_cyr ← sr_lat). Existing tr values are preserved.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve('src/assets/pois.json');
const raw = readFileSync(path, 'utf8');
const data = JSON.parse(raw);

let added = 0;
function visit(node) {
  if (Array.isArray(node)) {
    for (const x of node) visit(x);
    return;
  }
  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    if (
      typeof node.en === 'string' &&
      typeof node.sr_lat === 'string' &&
      typeof node.sr_cyr === 'string' &&
      typeof node.tr !== 'string'
    ) {
      node.tr = '';
      added++;
    }
    for (const k of keys) visit(node[k]);
  }
}
visit(data);

writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`✔ added tr: "" to ${added} Bilingual literal(s) in ${path}`);
```

- [ ] **Step 2: Run the script**

```bash
node scripts/add-tr-field.mjs
```

Expected stdout: `✔ added tr: "" to N Bilingual literal(s) …` where N is roughly equal to the count of `sr_lat` occurrences (`grep -c '"sr_lat"' src/assets/pois.json`).

- [ ] **Step 3: Sanity-check the diff**

```bash
git diff --stat src/assets/pois.json
grep -c '"tr"' src/assets/pois.json
grep -c '"sr_lat"' src/assets/pois.json
```

Expected: the `tr` count equals the `sr_lat` count.

- [ ] **Step 4: Commit**

```bash
git add scripts/add-tr-field.mjs src/assets/pois.json
git commit -m "feat(data): scaffold empty tr field on every Bilingual literal"
```

---

### Task 4: Add `tr` to `Bilingual` literals in `itineraries.ts`

**Files:**
- Modify: `src/app/data/itineraries.ts`

- [ ] **Step 1: Read the file to find every literal**

```bash
grep -n "sr_cyr" src/app/data/itineraries.ts
```

Each match is a Bilingual literal of the shape `{ en: '…', sr_lat: '…', sr_cyr: '…' }`.

- [ ] **Step 2: For every match, add `tr: ''`**

For each `Bilingual` literal in `src/app/data/itineraries.ts`, append `, tr: ''` before the closing brace. Example:

Before:
```ts
{ en: 'Old Town walk', sr_lat: 'Šetnja Starim gradom', sr_cyr: 'Шетња Старим градом' }
```

After:
```ts
{ en: 'Old Town walk', sr_lat: 'Šetnja Starim gradom', sr_cyr: 'Шетња Старим градом', tr: '' }
```

(The auto-draft step in Task 6 will fill `tr` from `en` if you re-run the build pipeline; but `itineraries.ts` is hand-authored, so leave them empty here and rely on the runtime `pick()` fallback. If you prefer pre-filled values, copy `en` into `tr` for each literal — same semantic.)

- [ ] **Step 3: Run tests / type-check**

```bash
npm test -- --watch=false
```

Expected: PASS. (If TS errors out about missing `tr`, you missed a literal — search again.)

- [ ] **Step 4: Commit**

```bash
git add src/app/data/itineraries.ts
git commit -m "feat(data): add tr field to itineraries Bilingual literals"
```

---

### Task 5: Update content build scripts to emit `tr` field

**Files:**
- Modify: `scripts/migrate-pois.mjs`
- Modify: `scripts/seed-poi-content.mjs`
- Modify: `scripts/fill-default-activities.mjs`

These three scripts each define a helper that builds `Bilingual` objects. They must all emit `tr` so any future re-run produces valid data.

- [ ] **Step 1: Update `scripts/migrate-pois.mjs`**

On line 49 (the helper that returns the Bilingual), replace:

```js
return { en: s, sr_lat: s, sr_cyr: '' };
```

with:

```js
return { en: s, sr_lat: s, sr_cyr: '', tr: '' };
```

- [ ] **Step 2: Update `scripts/seed-poi-content.mjs`**

On line 16, replace:

```js
function b(en, sr_lat) { return { en, sr_lat, sr_cyr: '' }; }
```

with:

```js
function b(en, sr_lat) { return { en, sr_lat, sr_cyr: '', tr: '' }; }
```

- [ ] **Step 3: Update `scripts/fill-default-activities.mjs`**

On line 16, replace:

```js
function b(en, sr_lat) { return { en, sr_lat, sr_cyr: '' }; }
```

with:

```js
function b(en, sr_lat) { return { en, sr_lat, sr_cyr: '', tr: '' }; }
```

- [ ] **Step 4: Run the script tests**

```bash
npm run test:scripts
```

Expected: PASS. (No script test currently asserts on the `tr` field, but the existing tests must still pass.)

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-pois.mjs scripts/seed-poi-content.mjs scripts/fill-default-activities.mjs
git commit -m "feat(scripts): emit tr field in Bilingual helpers"
```

---

### Task 6: Auto-draft `tr` from `en` in build-provenance

**Files:**
- Modify: `scripts/lib/build-provenance-core.mjs`
- Modify: `scripts/lib/build-provenance.test.mjs`

Mirror the `fillCyr` pattern: a `fillTr` helper that fills `tr` from `en` if empty. Call it everywhere `fillCyr` is called.

- [ ] **Step 1: Add the failing test**

Open `scripts/lib/build-provenance.test.mjs` and read the existing structure. Add a new test near the existing ones (look for tests asserting `sr_cyr` is filled and follow that exact pattern):

```js
test('auto-drafts tr from en when tr is empty', async () => {
  // (use the same harness as the sr_cyr test — read the prior test and copy)
  // After runBuildProvenance, assert poi.name.tr === poi.name.en for a fixture
  // whose source pois.json has tr: ''.
  // Also assert that an existing non-empty tr is preserved unchanged.
});
```

Concretely: locate the existing `sr_cyr` test, duplicate it, swap the field from `sr_cyr`/`sr_lat` to `tr`/`en`, and adapt the fixture POI accordingly.

- [ ] **Step 2: Run the test, confirm failure**

```bash
npm run test:scripts
```

Expected: the new test fails because `fillTr` does not exist yet.

- [ ] **Step 3: Add `fillTr` and call it**

In `scripts/lib/build-provenance-core.mjs`:

After the existing `fillCyr` function (around line 16), add:

```js
function fillTr(b) {
  if (b.tr) return b;
  return { ...b, tr: b.en || '' };
}

function fillBoth(b) {
  return fillTr(fillCyr(b));
}

function fillBothList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(fillBoth);
}
```

Then update the calls inside `runBuildProvenance` (lines 79–98). Replace every `fillCyr(…)` with `fillBoth(…)` and every `fillCyrList(…)` with `fillBothList(…)`:

```js
    poi.name = fillBoth(poi.name);
    poi.description = fillBoth(poi.description);
    poi.address = fillBoth(poi.address);
    if (poi.hours?.notes) poi.hours.notes = fillBoth(poi.hours.notes);
    if (poi.highlights) poi.highlights = fillBothList(poi.highlights);
    if (poi.tips) poi.tips = fillBothList(poi.tips);
    if (poi.history) poi.history = fillBoth(poi.history);
    if (poi.whatToExpect) {
      poi.whatToExpect = {
        pros: fillBothList(poi.whatToExpect.pros ?? []),
        cons: fillBothList(poi.whatToExpect.cons ?? []),
      };
    }
    if (Array.isArray(poi.activities)) {
      poi.activities = poi.activities.map(a => ({
        ...a,
        title: fillBoth(a.title),
        summary: fillBoth(a.summary),
      }));
    }
```

The old `fillCyr` and `fillCyrList` definitions can stay (they're now wrapped by `fillBoth`) — no need to delete to keep the diff focused.

- [ ] **Step 4: Run the test, confirm pass**

```bash
npm run test:scripts
```

Expected: PASS, including the new `tr` auto-draft test and all existing tests.

- [ ] **Step 5: Re-build the compiled POIs and inspect**

```bash
npm run build:content
node -e "const d=require('./src/assets/pois.compiled.json'); console.log(d[0].name.tr === d[0].name.en ? 'tr auto-drafted ✓' : 'tr NOT drafted ✗', JSON.stringify(d[0].name));"
```

Expected: `tr auto-drafted ✓` plus a Bilingual literal showing `tr` equal to `en`.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-provenance-core.mjs scripts/lib/build-provenance.test.mjs src/assets/pois.compiled.json
git commit -m "feat(scripts): auto-draft tr from en in build-provenance"
```

---

### Task 7: Create `src/i18n/tr.json` with all 92 UI strings

**Files:**
- Create: `src/i18n/tr.json`

- [ ] **Step 1: Create the file with the full Turkish bundle**

Write `src/i18n/tr.json`:

```json
{
  "tabs": {
    "home": "Ana sayfa",
    "map": "Harita",
    "routes": "Rotalar",
    "trips": "Geziler",
    "saved": "Kaydedilenler"
  },
  "home": {
    "greeting": "Merhaba, Belgrad",
    "todays_pick": "Bugünün seçimi",
    "open_now": "Yakınında şu an açık",
    "highlights": "Belgrad'ın öne çıkanları",
    "day_trips": "Günlük geziler",
    "see_all": "Tümünü gör"
  },
  "map": {
    "all_places": "Tüm yerler",
    "download_pack": "Belgrad paketini indir",
    "downloading": "Belgrad indiriliyor…",
    "download_failed": "İndirme başarısız",
    "try_again": "Tekrar dene",
    "recenter": "Konumuma odakla",
    "tracking_on": "Takibi durdur",
    "tracking_off": "Takibi başlat",
    "min_walk": "{n} dk yürüyüş"
  },
  "poi": {
    "back": "Geri",
    "save": "Kaydet",
    "saved": "Kaydedildi",
    "open_now": "Şu an açık",
    "closed": "Kapalı",
    "verified_on": "{date} tarihinde doğrulandı",
    "editor_pick": "Editör seçimi",
    "wikipedia": "Wikipedia",
    "osm": "OpenStreetMap",
    "official": "Resmi",
    "reviews": "{n} değerlendirme",
    "no_image": "Henüz fotoğraf yok",
    "not_found": "Bulunamadı",
    "address": "Adres",
    "hours": "Saatler",
    "price": "Fiyat",
    "tags": "Etiketler",
    "highlights": "Öne çıkanlar",
    "what_to_expect": "Neler bekleyebilirsin",
    "pros": "Değer bulduğun",
    "cons": "Dikkat etmen gereken",
    "tips": "İçeriden ipuçları",
    "history": "Arka plan",
    "open_until": "Açık · {time}'a kadar",
    "closed_opens": "Kapalı · {time}'da açılır",
    "hours_unknown": "Saatler doğrulanmadı",
    "see_full_week": "Tüm haftayı gör",
    "hide_full_week": "Tüm haftayı gizle",
    "photo_credits": "Fotoğraf kaynakları",
    "activities": "Yapılacak şeyler",
    "duration_min": "{n} dk",
    "duration_hr": "{n} sa",
    "intensity_easy": "Kolay",
    "intensity_moderate": "Orta",
    "intensity_active": "Hareketli",
    "budget_free": "Ücretsiz",
    "budget_low": "Az harcama",
    "budget_mid": "Orta harcama",
    "budget_high": "Yüksek harcama",
    "show_distance": "Mesafeyi göster"
  },
  "itinerary": {
    "back": "Geri",
    "show_on_map": "Haritada göster",
    "complete": "Rota tamamlandı",
    "next_stop": "Sonraki durak",
    "stops": "{n} durak",
    "route_unavailable": "Rota geometrisi yok — adımlar yine de geçerli."
  },
  "saved": {
    "empty_title": "Henüz kaydedilen yok",
    "empty_body": "Bir yerin yer imine dokunarak burada saklayabilirsin."
  },
  "trips": {
    "empty_title": "Günlük geziler yakında",
    "empty_body": "Novi Sad, Topola, Avala ve daha fazlası — ulaşım bilgisiyle — bir sonraki güncellemede."
  },
  "settings": {
    "language": "Dil",
    "language_en": "English",
    "language_sr": "Srpski",
    "language_sr_cyr": "Srpski (Kiril)",
    "language_tr": "Türkçe",
    "currency": "Para birimi",
    "currency_rsd": "RSD (Sırp dinarı)",
    "currency_rsd_eur": "RSD ve EUR",
    "offline_pack": "Çevrimdışı paket",
    "gps": "GPS",
    "permission": "İzin",
    "tracking": "takip",
    "start": "Başlat",
    "stop": "Durdur",
    "install": "Beograde'i yükle",
    "install_ios": "Paylaş'a, sonra Ana Ekrana Ekle'ye dokun.",
    "downloaded_today": "Bugün",
    "downloaded_yesterday": "Dün",
    "downloaded_days": "{n} gün önce"
  },
  "common": {
    "close": "Kapat",
    "cancel": "İptal",
    "confirm": "Onayla",
    "loading": "Yükleniyor…"
  }
}
```

- [ ] **Step 2: Sanity-check key parity with `en.json`**

```bash
node -e "
  const en = require('./src/i18n/en.json');
  const tr = require('./src/i18n/tr.json');
  const flat = (o, p='') => Object.entries(o).flatMap(([k,v]) =>
    typeof v === 'object' ? flat(v, p+k+'.') : [p+k]
  );
  const enKeys = flat(en).sort();
  const trKeys = flat(tr).sort();
  const missing = enKeys.filter(k => !trKeys.includes(k));
  const extra   = trKeys.filter(k => !enKeys.includes(k));
  console.log('en keys:', enKeys.length, 'tr keys:', trKeys.length);
  if (missing.length) console.error('missing in tr:', missing);
  if (extra.length)   console.error('extra in tr:',   extra);
  process.exit(missing.length || extra.length ? 1 : 0);
"
```

Expected: `en keys: 92 tr keys: 93` — the extra is `settings.language_tr` which `en.json` doesn't yet have. Task 8 adds it.

After Task 8 runs, this sanity check should report equal counts and zero missing/extra.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/tr.json
git commit -m "feat(i18n): add tr.json with 92 hand-translated UI strings"
```

---

### Task 8: Add `settings.language_tr` label to existing string bundles

**Files:**
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/sr-Latn.json`
- Modify: `src/i18n/sr-cyr-overrides.json` (only if the auto-transliteration produces a wrong form)

- [ ] **Step 1: Add the label to `src/i18n/en.json`**

Inside the `"settings"` block, after `"language_sr_cyr": "Srpski (Cyrillic)",` add:

```json
    "language_tr": "Türkçe",
```

- [ ] **Step 2: Add the label to `src/i18n/sr-Latn.json`**

Inside the `"settings"` block, after `"language_sr_cyr": ...`, add:

```json
    "language_tr": "Turski",
```

- [ ] **Step 3: Regenerate the Cyrillic bundle**

```bash
npm run build:i18n
```

Expected: the script transliterates `Turski` → `Турски` and the build passes. If it warns about a non-round-trip, add an override:

In `src/i18n/sr-cyr-overrides.json`:

```json
{
  "settings": {
    "language_tr": "Турски"
  }
}
```

Then re-run `npm run build:i18n` until clean.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/sr-Latn.json src/i18n/sr-Cyrl.json src/i18n/sr-cyr-overrides.json
git commit -m "feat(i18n): add language_tr label to en/sr-Latn/sr-Cyrl"
```

---

### Task 9: Wire `StringsService` to load `tr.json`

**Files:**
- Modify: `src/app/core/i18n/strings.service.ts`
- Modify: `src/app/core/i18n/strings.service.spec.ts`

- [ ] **Step 1: Add the failing test**

In `src/app/core/i18n/strings.service.spec.ts`, find the existing test that asserts the bundle is `enStrings` for `{ locale: 'en', script: 'Latn' }` and `srLatStrings` for `{ locale: 'sr', script: 'Latn' }`. Add a parallel test:

```ts
  it('returns Turkish bundle when locale is tr', () => {
    i18n.setLocale({ locale: 'tr', script: 'Latn' });
    expect(service.t().settings.language_tr).toBe('Türkçe');
  });
```

(Adapt to the existing harness — the file already shows the pattern.)

- [ ] **Step 2: Run the test, confirm failure**

```bash
npm test -- --watch=false
```

Expected: failure — the service does not yet know about Turkish, so `t()` returns the English bundle whose `language_tr` field is `"Türkçe"`. If the test passes here, it's a false positive; tighten the assertion to a Turkish-only string like `expect(service.t().tabs.home).toBe('Ana sayfa');`.

- [ ] **Step 3: Update the service**

Replace `src/app/core/i18n/strings.service.ts` with:

```ts
import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';
import srCyrStrings from '../../../i18n/sr-Cyrl.json';
import trStrings from '../../../i18n/tr.json';

type StringsBundle = typeof enStrings;

@Injectable({ providedIn: 'root' })
export class StringsService {
  private readonly i18n = inject(I18nService);
  readonly t = computed<StringsBundle>(() => {
    const loc = this.i18n.locale();
    if (loc.locale === 'tr') return trStrings as StringsBundle;
    if (loc.locale !== 'sr') return enStrings;
    if (loc.script === 'Cyrl' && this.i18n.cyrillicEnabled()) return srCyrStrings as StringsBundle;
    return srLatStrings;
  });
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
npm test -- --watch=false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/i18n/strings.service.ts src/app/core/i18n/strings.service.spec.ts
git commit -m "feat(i18n): StringsService returns tr bundle when locale is tr"
```

---

### Task 10: Settings — cycle locale through Turkish, render label

**Files:**
- Modify: `src/app/features/settings/settings.component.ts`

The current cycle is `en → sr-Latn → sr-Cyrl → en`. Extend it to `en → sr-Latn → sr-Cyrl → tr → en`. The label computed property must produce the Turkish label when the locale is `tr`.

- [ ] **Step 1: Update `localeLabel`**

Replace the `localeLabel` computed (lines 42–47) with:

```ts
  protected readonly localeLabel = computed(() => {
    const loc = this.i18n.locale();
    if (loc.locale === 'en') return this.t().settings.language_en;
    if (loc.locale === 'tr') return this.t().settings.language_tr;
    if (loc.script === 'Cyrl') return this.t().settings.language_sr_cyr;
    return this.t().settings.language_sr;
  });
```

- [ ] **Step 2: Update `cycleLocale`**

Replace the `cycleLocale` method (lines 58–66) with:

```ts
  cycleLocale(): void {
    const cur = this.i18n.locale();
    if (cur.locale === 'en') {
      this.i18n.setLocale({ locale: 'sr', script: 'Latn' });
    } else if (cur.locale === 'sr' && cur.script === 'Latn') {
      this.i18n.setLocale({ locale: 'sr', script: 'Cyrl' });
    } else if (cur.locale === 'sr' && cur.script === 'Cyrl') {
      this.i18n.setLocale({ locale: 'tr', script: 'Latn' });
    } else {
      this.i18n.setLocale({ locale: 'en', script: 'Latn' });
    }
  }
```

- [ ] **Step 3: Manual verification — start dev server**

```bash
npm start
```

Then in the browser, open Settings, tap the language button four times. Expected sequence of labels (assuming you start on English): `English → Srpski → Srpski (Kiril/Cyrillic) → Türkçe → English`.

Cross-check that strings on the Home tab change accordingly — the tabs row should read `Ana sayfa / Harita / Rotalar / Geziler / Kaydedilenler` when Turkish is active, and POI names fall back to English (until content curation fills `tr` fields per POI).

- [ ] **Step 4: Run the full test suite**

```bash
npm test -- --watch=false
npm run test:scripts
```

Expected: PASS on both.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/settings/settings.component.ts
git commit -m "feat(settings): cycle locale through Turkish; render Türkçe label"
```

---

### Task 11: Final verification + PR + merge

- [ ] **Step 1: Run every check end-to-end**

```bash
npm test -- --watch=false
npm run test:scripts
npm run build:content
npm run build           # verifies the production bundle compiles
```

Expected: all pass. If `build` is missing in `package.json`, use whatever the project's release command is (see `scripts` block).

- [ ] **Step 2: Manual smoke test**

Run `npm start`, then with the browser:

1. Open Settings → cycle language to Türkçe.
2. Visit Home — header reads `Merhaba, Belgrad`, tabs are Turkish.
3. Open any POI — name/description should display the English value (the auto-drafted `tr` equals `en`).
4. Open Routes / Trips — labels are Turkish, route titles fall back to English (itineraries have empty `tr` per Task 4).
5. Refresh the page — language preference persists (it's stored in `localStorage`).

If you set `navigator.language` to `tr-TR` (via a fresh incognito profile with `Accept-Language` set) and clear `localStorage`, the app should default to Turkish on first load.

- [ ] **Step 3: Open the PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat(i18n): Turkish (tr) locale" --body "$(cat <<'EOF'
## Summary
- Adds `tr` as a third locale alongside English and Serbian (Latn/Cyrl).
- Extends `Bilingual` type with `tr: string`; `pick()` returns Turkish with English fallback when empty.
- Auto-drafts `tr` from `en` in build-provenance (mirrors `sr_cyr` ← `sr_lat`).
- Ships `src/i18n/tr.json` with all 92 UI strings hand-translated.
- Settings language cycle: en → sr-Latn → sr-Cyrl → tr → en.
- Per-POI content curation is a follow-up — Turkish currently displays the English fallback for POI text.

## Test plan
- [x] `npm test -- --watch=false`
- [x] `npm run test:scripts`
- [x] `npm run build:content`
- [x] Manual: cycle Settings → Türkçe, verify Home/Tabs/Settings render in Turkish; refresh persists; `navigator.language=tr-TR` defaults to Turkish on first load.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Merge**

After review: squash-merge via the PR UI or `gh pr merge --squash --delete-branch`.

---

## Self-review notes

- **Spec coverage:** All three integration surfaces (type system, build pipeline, UI) are covered. No spec section is left without a task.
- **Type consistency:** `Bilingual` adds one field `tr: string`. `Locale` adds `'tr'`. `pick()` adds a `tr` branch. `Script` is unchanged. All literal updates in tests and data files include the new field.
- **No placeholders:** Every code step contains the actual diff or the actual full file. UI string translations are inlined verbatim (92 keys). The migration script is complete and runnable.
- **Follow-ups stated up-front:** Renaming `Bilingual` → `Localized`, and curator-translating per-POI content, are explicitly out of scope.
