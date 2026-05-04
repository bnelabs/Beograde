# Beograde Redesign — Phase 1a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the redesigned Beograde PWA: Soft Modern visual system with the Belgrade-specific identity layer, five-tab navigation with a magazine-feed Home, structured POI data with bilingual content + parsed opening hours + provenance chips, three core charts, persisted itinerary progress, and every known bug folded into the rewrites — running on the existing 32 city POIs.

**Architecture:** Angular 21 zoneless + signals, standalone components. Existing services (geolocation, proximity, tile-pack, pwa-install) extended; new services for i18n, hours parsing, saved places, itinerary progress. New design tokens in two layered CSS files (`soft-modern.css`, `belgrade-tokens.css`). UI primitives extracted to `src/app/ui/`. Tests run via Vitest (`@angular/build:unit-test`); use `fake-indexeddb` for storage tests.

**Tech Stack:** Angular 21, TypeScript 5.9, Tailwind v4, MapLibre GL, PMTiles, idb-keyval, opening_hours (npm package), fake-indexeddb (test only), Vitest.

**Source spec:** `docs/superpowers/specs/2026-05-04-beograde-redesign-design.md`

---

## File Structure

### New files

```
src/styles/
  soft-modern.css                  # base design tokens (palette, type, spacing)
  belgrade-tokens.css              # Belgrade-specific identity layer

src/app/core/i18n/
  i18n.types.ts                    # Locale, Script, Bilingual<T>
  i18n.ts                          # pure helpers: pickLocale, defaultLocale
  i18n.spec.ts
  i18n.service.ts                  # signals current locale + script
  i18n.service.spec.ts

src/app/core/hours/
  hours.service.ts                 # wraps opening_hours.js
  hours.service.spec.ts

src/app/core/saved/
  saved.service.ts                 # IDB-backed signal of SavedPlace[]
  saved.service.spec.ts

src/app/core/itinerary-progress/
  itinerary-progress.service.ts    # IDB-backed progress per itinerary
  itinerary-progress.service.spec.ts

src/app/ui/
  card/card.component.ts           # base card primitive
  chip/chip.component.ts           # filter, provenance, editor-pick variants
  hero-card/hero-card.component.ts # Today's pick hero
  bottom-nav/bottom-nav.component.ts
  two-rivers-mark/two-rivers-mark.component.ts  # logo SVG
  i18n-text/i18n-text.pipe.ts      # picks the right form from Bilingual<T>
  charts/itinerary-timeline.component.ts
  charts/hours-heatmap.component.ts
  charts/distance-progress.component.ts

src/app/features/home/
  home.component.ts                # Home tab — magazine feed
  home.component.html
  home.component.css

src/app/features/saved/
  saved.component.ts               # Saved tab
  saved.component.html

src/app/features/trips/
  trips.component.ts               # Trips tab (placeholder for Phase 1b)
  trips.component.html

src/i18n/
  en.json                          # UI strings (English)
  sr-Latn.json                     # UI strings (Serbian, Latin script)

scripts/
  migrate-pois.mjs                 # one-shot migration of legacy pois.json → v2
  migrate-itineraries.mjs          # bilingual migration for itineraries.ts
```

### Modified files

```
package.json                       # +opening_hours, +fake-indexeddb dev
src/app/data/types.ts              # full rewrite — bilingual, OpeningHours, etc.
src/app/data/pois.ts               # loader uses new schema
src/app/data/itineraries.ts        # bilingual fields
src/assets/pois.json               # migrated to v2 schema in-place by script
src/app/app.html                   # use BottomNav primitive
src/app/app.ts                     # 5-tab nav, Home as default
src/app/app.routes.ts              # /home, /saved, /trips, default redirects to /home
src/styles.css                     # imports soft-modern + belgrade tokens
src/manifest.webmanifest           # theme_color → new accent #B8540C
src/app/core/geolocation.service.ts # bug fixes: clear error on success
src/app/features/map/map.component.{ts,html,css} # ngClass fixes, recenter+watch, polished
src/app/features/poi-detail/poi-detail.component.{ts,html} # redesign with chips + heatmap
src/app/features/poi-list/poi-list.component.{ts,html} # nearby filtered list (used in Map)
src/app/features/itinerary-list/itinerary-list.component.{ts,html} # Routes tab
src/app/features/itinerary-detail/itinerary-detail.component.{ts,html} # timeline + progress
src/app/features/settings/settings.component.{ts,html} # language toggle, currency
README.md                          # accurate counts + new feature list
```

---

## Spec coverage map

| Spec section | Tasks |
|---|---|
| §4 IA: 5 tabs + Home feed | 11, 13, 19 |
| §6 Data model | 3, 7, 8 |
| §7 Visual system + Belgrade layer | 2 |
| §7 Type system | 2 |
| §8 Provenance chips | 9, 14 |
| §10 Charts (3 core in 1a) | 11 |
| §11 Bug fixes | 4, 14, 15, 16 |
| §12 i18n strategy | 4 |
| §15 Itinerary progress / saved IDB | 6, 7 |
| §17 Accessibility | 9, 10, 11, 12 |
| §21 Phase 1a scope | All |

---

## Conventions

- **Commit message style:** lowercase scope, imperative — `feat(home): add Today's pick hero`, `fix(map): clear geo error on requestOnce success`, `chore(deps): add opening_hours`.
- **Test runner:** `npm test -- --run` (Vitest non-watch). Single test: `npm test -- --run path/to/file.spec.ts`.
- **Lint:** `npm run lint`. Plan steps assume lint passes after each commit.
- **Build sanity:** `npm run build` after large structural changes (Tasks 8, 12, 22).
- **No skipped hooks.** Never `--no-verify`.
- **One commit per task** unless the task explicitly says otherwise.
- **Plan file paths are absolute when running shell commands; relative when shown in diffs.**

---

## Task 1: Add dependencies and verify baseline

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Verify baseline build still works**

Run:
```bash
cd /Users/barisnacierzeren/Downloads/14_Personal/Beograde
npm install
npm run lint
npm test -- --run
npm run build
```
Expected: all four succeed. The build will warn about a missing `belgrade.pmtiles` if the offline pack hasn't been built; that's fine.

- [ ] **Step 2: Add new runtime + dev dependencies**

Run:
```bash
npm install opening_hours@^3.8.0
npm install --save-dev fake-indexeddb@^6.0.0
```

- [ ] **Step 3: Verify install succeeded**

Run:
```bash
npm ls opening_hours fake-indexeddb
```
Expected: both listed without `UNMET` markers.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add opening_hours and fake-indexeddb"
```

---

## Task 2: Design tokens — Soft Modern + Belgrade identity layer

**Files:**
- Create: `src/styles/soft-modern.css`
- Create: `src/styles/belgrade-tokens.css`
- Modify: `src/styles.css`
- Modify: `src/manifest.webmanifest`

- [ ] **Step 1: Create the Soft Modern token sheet**

Create `src/styles/soft-modern.css` with:
```css
/*
 * Soft Modern — base design tokens for Beograde.
 * Pair with belgrade-tokens.css for the city-specific identity layer.
 */

:root {
  /* Surfaces */
  --bg-warm-1: #FFF8F1;
  --bg-warm-2: #F4ECE0;
  --surface: #FFFFFF;
  --surface-elev: #FFFFFF;

  /* Ink */
  --ink: #2A2018;
  --ink-2: #7A6A5A;
  --ink-3: #9A8B7A;

  /* Brand */
  --accent: #B8540C;
  --accent-soft: #FFE3CC;

  /* Status */
  --good: #2D7A1F;
  --good-soft: #E0F2DC;
  --warn: #B8810C;
  --bad: #B8200C;

  /* Map */
  --map-water: #A4C8E0;
  --map-park: #D6E8C4;

  /* Radii */
  --radius-pill: 999px;
  --radius-card: 20px;
  --radius-card-lg: 24px;
  --radius-tile: 14px;

  /* Shadows */
  --shadow-card: 0 6px 18px rgba(140, 80, 30, 0.10), 0 1px 3px rgba(140, 80, 30, 0.05);
  --shadow-nav: 0 -4px 16px rgba(0, 0, 0, 0.06);

  /* Type sizes */
  --fs-display: 26px;
  --fs-display-lg: 32px;
  --fs-body: 15px;
  --fs-secondary: 13px;
  --fs-meta: 11px;

  /* Motion */
  --motion-tab: 180ms ease-out;
  --motion-detail: 280ms cubic-bezier(0.32, 0.72, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-tab: 0ms;
    --motion-detail: 0ms;
  }
}
```

- [ ] **Step 2: Create the Belgrade identity layer**

Create `src/styles/belgrade-tokens.css` with:
```css
/*
 * Belgrade-specific identity — layered on top of Soft Modern.
 * Only colours and motifs that are deliberately not part of the global Soft
 * Modern palette belong here.
 */

:root {
  /* River — Sava + Danube blue, deeper than --map-water for foreground use */
  --river: #6BA3CC;
  --river-deep: #3F7FAA;

  /* Sandstone — Kalemegdan walls; old-town moments */
  --fortress: #C7A879;
  --fortress-deep: #8E7448;

  /* Transit — GSP livery red; reserved for transit elements only */
  --transit-red: #C8302C;
  --transit-red-soft: #FBE0DF;

  /* Concrete — brutalist accents (Beton Hala, New Belgrade, Drugstore) */
  --concrete: #8A8579;
  --concrete-deep: #4F4C45;
}
```

- [ ] **Step 3: Wire tokens into the global stylesheet**

Modify `src/styles.css`. Replace the contents with:
```css
@import './styles/soft-modern.css';
@import './styles/belgrade-tokens.css';
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Bridge to Tailwind — these names are referenced by templates as bg-accent etc. */
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-good: var(--good);
  --color-good-soft: var(--good-soft);
  --color-warn: var(--warn);
  --color-bad: var(--bad);
  --color-river: var(--river);
  --color-fortress: var(--fortress);
  --color-transit: var(--transit-red);
  --color-concrete: var(--concrete);
}

@layer base {
  html, body {
    height: 100%;
    height: 100dvh;
    margin: 0;
  }
  body {
    font-family: var(--font-sans);
    background: linear-gradient(180deg, var(--bg-warm-1) 0%, var(--bg-warm-2) 100%);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
    font-feature-settings: "tnum";
  }
  h1, h2, h3, h4 {
    letter-spacing: -0.02em;
    font-weight: 700;
  }
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    user-select: none;
  }
}

@layer utilities {
  .text-balance { text-wrap: balance; }
  .pill { border-radius: var(--radius-pill); }
  .card-shadow { box-shadow: var(--shadow-card); }
}
```

- [ ] **Step 4: Update manifest theme colour**

Modify `src/manifest.webmanifest`. Change `"theme_color": "#FF6321"` to `"theme_color": "#B8540C"`.

- [ ] **Step 5: Verify build still succeeds**

Run:
```bash
npm run build
```
Expected: succeeds. Lint:
```bash
npm run lint
```
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/styles/ src/styles.css src/manifest.webmanifest
git commit -m "feat(design): add Soft Modern + Belgrade identity tokens"
```

---

## Task 3: New TypeScript data model

**Files:**
- Modify: `src/app/data/types.ts` (full rewrite)
- Create: `src/app/data/types.spec.ts`

- [ ] **Step 1: Write the failing type smoke test**

Create `src/app/data/types.spec.ts` with:
```ts
import {
  POI, Itinerary, ItineraryStop, TransitInfo, OpeningHours,
  ImageAsset, ReliabilityScore, Bilingual,
} from './types';

describe('types', () => {
  it('POI carries bilingual fields, optional transit, provenance', () => {
    const bg: Bilingual = { en: 'a', sr_lat: 'a', sr_cyr: 'a' };
    const poi: POI = {
      id: 'x',
      region: 'city',
      category: 'cafe',
      name: bg,
      description: bg,
      address: bg,
      lng: 0,
      lat: 0,
      tags: [],
      images: [],
      verifiedAt: '2026-05-04',
      sources: [],
      reliability: {
        score: 0,
        checks: { wikipedia: false, osm: false, official: false, crowdsourced: false },
      },
      editorialConfidence: 'medium',
    };
    expect(poi.id).toBe('x');
  });

  it('Itinerary has bilingual title/subtitle and stops', () => {
    const bg: Bilingual = { en: 't', sr_lat: 't', sr_cyr: 't' };
    const stop: ItineraryStop = { poiId: 'x', arrivalOffsetMinutes: 0, durationMinutes: 30 };
    const it: Itinerary = {
      id: 'i',
      title: bg,
      subtitle: bg,
      durationMinutes: 60,
      vibe: [],
      stops: [stop],
      geometryUrl: '',
    };
    expect(it.stops).toHaveLength(1);
  });

  it('TransitInfo carries departures and validity', () => {
    const bg: Bilingual = { en: 's', sr_lat: 's', sr_cyr: 's' };
    const t: TransitInfo = {
      mode: 'soko',
      fromStation: bg,
      toStation: bg,
      durationMinutes: 36,
      departures: ['06:25', '14:25'],
      validity: { from: '2026-04-01', to: '2026-10-31' },
      fareRSD: { min: 290, max: 290 },
    };
    expect(t.departures).toEqual(['06:25', '14:25']);
  });

  it('OpeningHours carries raw OSM grammar', () => {
    const h: OpeningHours = { raw: 'Tu-Su 10:00-18:00' };
    expect(h.raw).toContain('Tu-Su');
  });

  it('ImageAsset carries lqip + license', () => {
    const img: ImageAsset = {
      src: 'a',
      width: 100,
      height: 100,
      lqip: 'data:image/jpeg;base64,...',
      credit: 'me',
      license: 'CC BY 4.0',
    };
    expect(img.license).toBe('CC BY 4.0');
  });

  it('ReliabilityScore matches the four-check model', () => {
    const r: ReliabilityScore = {
      score: 75,
      checks: { wikipedia: true, osm: true, official: true, crowdsourced: false },
    };
    expect(r.score).toBe(75);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- --run src/app/data/types.spec.ts`
Expected: FAIL — types not yet defined.

- [ ] **Step 3: Replace types.ts with the new schema**

Replace `src/app/data/types.ts` entirely with:
```ts
export type Category = 'sight' | 'cuisine' | 'nightlife' | 'cafe' | 'museum' | 'viewpoint' | 'park';

export type Locale = 'en' | 'sr';
export type Script = 'Latn' | 'Cyrl';

/** Bilingual content. sr_cyr is auto-transliterated from sr_lat at build time
 * (Phase 1b enables the Cyrillic UI toggle once the override file is reviewed). */
export interface Bilingual {
  en: string;
  sr_lat: string;
  sr_cyr: string;
}

export interface OpeningHours {
  /** OSM opening_hours grammar — the canonical form. Parsed at runtime by HoursService. */
  raw: string;
  notes?: Bilingual;
}

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  /** Base64-inlined 8x8 JPEG, ~150 bytes. Renders instantly while the real image loads. */
  lqip: string;
  credit: string;
  license: string;
  source?: string;
}

export type SourceRef =
  | { kind: 'wikipedia'; url: string; lang: 'en' | 'sr' }
  | { kind: 'osm'; ref: string }
  | { kind: 'official'; url: string; org: string }
  | { kind: 'google-places'; placeId: string; reviewCount: number; rating: number; checkedAt: string }
  | { kind: 'tripadvisor'; url: string; reviewCount: number; rating: number; checkedAt: string };

export interface ReliabilityScore {
  /** 0..100, transparency only — never a publish gate. */
  score: number;
  checks: {
    wikipedia: boolean;
    osm: boolean;
    official: boolean;
    crowdsourced: boolean;
  };
}

export interface TransitInfo {
  mode: 'soko' | 'regional-train' | 'suburban-train' | 'intercity-bus' | 'city-bus';
  fromStation: Bilingual;
  toStation: Bilingual;
  durationMinutes: number;
  /** Local-time HH:MM departure list, weekday/typical. */
  departures: string[];
  weekendDepartures?: string[];
  validity: { from: string; to: string };
  lastReturnLocal?: string;
  fareRSD: { min: number; max: number };
  bookingUrl?: string;
  notes?: Bilingual;
}

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
  sources: SourceRef[];
  reliability: ReliabilityScore;
  editorialConfidence: 'high' | 'medium' | 'low';
}

export interface ItineraryStop {
  poiId: string;
  arrivalOffsetMinutes: number;
  durationMinutes: number;
  notes?: Bilingual;
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
}

export interface UserPosition {
  lng: number;
  lat: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface SavedPlace {
  poiId: string;
  savedAt: number;
  note?: string;
}

export interface ItineraryProgress {
  itineraryId: string;
  startedAt: number;
  reachedStopIds: string[];
  lastUpdatedAt: number;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- --run src/app/data/types.spec.ts`
Expected: PASS.

- [ ] **Step 5: Verify the rest of the app's types compile (will surface failures)**

Run: `npm run build`
Expected: build will fail because existing components reference old POI shape (e.g. `poi.name` as string, `poi.address` as string). Don't fix those yet — Tasks 8, 14, 15, 16 will rewrite the components. Note the failures, then continue. (Lint is also expected to fail until then.)

- [ ] **Step 6: Commit (build is broken — flagged)**

```bash
git add src/app/data/types.ts src/app/data/types.spec.ts
git commit -m "feat(types): bilingual + OpeningHours + provenance data model

Build will fail until features rewrite to new schema (next tasks)."
```

---

## Task 4: i18n primitives — pure helpers + service

**Files:**
- Create: `src/app/core/i18n/i18n.types.ts`
- Create: `src/app/core/i18n/i18n.ts`
- Create: `src/app/core/i18n/i18n.spec.ts`
- Create: `src/app/core/i18n/i18n.service.ts`
- Create: `src/app/core/i18n/i18n.service.spec.ts`
- Create: `src/i18n/en.json`
- Create: `src/i18n/sr-Latn.json`

- [ ] **Step 1: Define i18n types**

Create `src/app/core/i18n/i18n.types.ts`:
```ts
import type { Bilingual, Locale, Script } from '../../data/types';

export type ResolvedLocale = { locale: Locale; script: Script };
export type { Bilingual, Locale, Script };

export const DEFAULT_LOCALE: ResolvedLocale = { locale: 'en', script: 'Latn' };
```

- [ ] **Step 2: Write the failing pure-helper test**

Create `src/app/core/i18n/i18n.spec.ts`:
```ts
import { defaultLocaleFromBrowser, pick } from './i18n';
import type { Bilingual } from '../../data/types';

const sample: Bilingual = { en: 'Hello', sr_lat: 'Zdravo', sr_cyr: 'Здраво' };

describe('i18n helpers', () => {
  describe('pick', () => {
    it('picks English by default', () => {
      expect(pick(sample, { locale: 'en', script: 'Latn' })).toBe('Hello');
    });

    it('picks Serbian Latin', () => {
      expect(pick(sample, { locale: 'sr', script: 'Latn' })).toBe('Zdravo');
    });

    it('picks Serbian Cyrillic', () => {
      expect(pick(sample, { locale: 'sr', script: 'Cyrl' })).toBe('Здраво');
    });

    it('falls back to English when sr field is empty', () => {
      const partial: Bilingual = { en: 'Only', sr_lat: '', sr_cyr: '' };
      expect(pick(partial, { locale: 'sr', script: 'Latn' })).toBe('Only');
    });
  });

  describe('defaultLocaleFromBrowser', () => {
    it('returns sr-Latn when navigator language starts with sr', () => {
      expect(defaultLocaleFromBrowser('sr-RS')).toEqual({ locale: 'sr', script: 'Latn' });
    });

    it('returns en-Latn for everything else', () => {
      expect(defaultLocaleFromBrowser('en-US')).toEqual({ locale: 'en', script: 'Latn' });
      expect(defaultLocaleFromBrowser('de-DE')).toEqual({ locale: 'en', script: 'Latn' });
    });

    it('handles undefined gracefully', () => {
      expect(defaultLocaleFromBrowser(undefined)).toEqual({ locale: 'en', script: 'Latn' });
    });
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `npm test -- --run src/app/core/i18n/i18n.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the pure helpers**

Create `src/app/core/i18n/i18n.ts`:
```ts
import type { Bilingual } from '../../data/types';
import { DEFAULT_LOCALE, ResolvedLocale } from './i18n.types';

export function pick(value: Bilingual, locale: ResolvedLocale): string {
  if (locale.locale === 'sr') {
    if (locale.script === 'Cyrl' && value.sr_cyr) return value.sr_cyr;
    if (value.sr_lat) return value.sr_lat;
  }
  return value.en;
}

export function defaultLocaleFromBrowser(lang: string | undefined): ResolvedLocale {
  if (!lang) return DEFAULT_LOCALE;
  if (lang.toLowerCase().startsWith('sr')) return { locale: 'sr', script: 'Latn' };
  return DEFAULT_LOCALE;
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- --run src/app/core/i18n/i18n.spec.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing service test**

Create `src/app/core/i18n/i18n.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
  });

  it('initialises to browser locale', () => {
    const svc = TestBed.inject(I18nService);
    expect(svc.locale().locale).toBeDefined();
    expect(svc.locale().script).toBeDefined();
  });

  it('persists locale changes', () => {
    const svc = TestBed.inject(I18nService);
    svc.setLocale({ locale: 'sr', script: 'Latn' });
    expect(svc.locale()).toEqual({ locale: 'sr', script: 'Latn' });
    expect(localStorage.getItem('beograde:locale')).toContain('sr');
  });

  it('hides Cyrillic in Phase 1a', () => {
    const svc = TestBed.inject(I18nService);
    expect(svc.cyrillicEnabled()).toBe(false);
  });
});
```

- [ ] **Step 7: Run the test to confirm it fails**

Run: `npm test -- --run src/app/core/i18n/i18n.service.spec.ts`
Expected: FAIL.

- [ ] **Step 8: Implement the service**

Create `src/app/core/i18n/i18n.service.ts`:
```ts
import { Injectable, signal } from '@angular/core';
import { defaultLocaleFromBrowser } from './i18n';
import { ResolvedLocale } from './i18n.types';

const STORAGE_KEY = 'beograde:locale';
/** Phase 1a flag: hide Cyrillic toggle until 1b ships the override file. */
const CYRILLIC_ENABLED = false;

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<ResolvedLocale>(this.load());
  readonly cyrillicEnabled = signal(CYRILLIC_ENABLED);

  setLocale(next: ResolvedLocale): void {
    if (!CYRILLIC_ENABLED && next.script === 'Cyrl') {
      next = { ...next, script: 'Latn' };
    }
    this.locale.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode etc. — silent.
    }
  }

  private load(): ResolvedLocale {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ResolvedLocale;
        if (parsed?.locale) return parsed;
      }
    } catch {
      // Fall through.
    }
    return defaultLocaleFromBrowser(typeof navigator !== 'undefined' ? navigator.language : undefined);
  }
}
```

- [ ] **Step 9: Run the test to confirm it passes**

Run: `npm test -- --run src/app/core/i18n/i18n.service.spec.ts`
Expected: PASS.

- [ ] **Step 10: Create UI string tables**

Create `src/i18n/en.json`:
```json
{
  "tabs": {
    "home": "Home",
    "map": "Map",
    "routes": "Routes",
    "trips": "Trips",
    "saved": "Saved"
  },
  "home": {
    "greeting": "Hello, Beograd",
    "todays_pick": "Today's pick",
    "open_now": "Open now near you",
    "day_trips": "Day trips",
    "day_trips_coming_soon": "Day trips by train and bus arrive in the next update.",
    "see_all": "See all"
  },
  "map": {
    "all_places": "All places",
    "download_pack": "Download Belgrade pack",
    "downloading": "Downloading Belgrade…",
    "download_failed": "Download failed",
    "try_again": "Try again",
    "recenter": "Recenter on my location",
    "tracking_on": "Stop tracking",
    "tracking_off": "Start tracking",
    "min_walk": "{n} min walk"
  },
  "poi": {
    "back": "Back",
    "save": "Save",
    "saved": "Saved",
    "open_now": "Open now",
    "closed": "Closed",
    "verified_on": "Verified {date}",
    "editor_pick": "Editor's pick",
    "wikipedia": "Wikipedia",
    "osm": "OpenStreetMap",
    "official": "Official",
    "reviews": "{n} reviews",
    "no_image": "No image yet",
    "not_found": "Not found",
    "address": "Address",
    "hours": "Hours",
    "price": "Price",
    "tags": "Tags"
  },
  "itinerary": {
    "back": "Back",
    "show_on_map": "Show on map",
    "complete": "Itinerary complete",
    "next_stop": "Next stop",
    "stops": "{n} stops",
    "route_unavailable": "Route geometry unavailable — the steps still work."
  },
  "saved": {
    "empty_title": "Nothing saved yet",
    "empty_body": "Tap the bookmark on a place to keep it here for later."
  },
  "trips": {
    "empty_title": "Day trips coming soon",
    "empty_body": "Novi Sad, Topola, Avala and more — with transit info — land in the next update."
  },
  "settings": {
    "language": "Language",
    "language_en": "English",
    "language_sr": "Srpski",
    "currency": "Currency",
    "currency_rsd": "RSD (Serbian dinar)",
    "currency_rsd_eur": "RSD with EUR",
    "offline_pack": "Offline pack",
    "gps": "GPS",
    "permission": "Permission",
    "tracking": "tracking",
    "start": "Start",
    "stop": "Stop",
    "install": "Install Beograde",
    "install_ios": "Tap Share, then Add to Home Screen.",
    "downloaded_today": "Today",
    "downloaded_yesterday": "Yesterday",
    "downloaded_days": "{n} days ago"
  },
  "common": {
    "close": "Close",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "loading": "Loading…"
  }
}
```

Create `src/i18n/sr-Latn.json`:
```json
{
  "tabs": {
    "home": "Početna",
    "map": "Mapa",
    "routes": "Rute",
    "trips": "Izleti",
    "saved": "Sačuvano"
  },
  "home": {
    "greeting": "Zdravo, Beograde",
    "todays_pick": "Danas preporučujemo",
    "open_now": "Otvoreno blizu tebe",
    "day_trips": "Izleti iz grada",
    "day_trips_coming_soon": "Izleti vozom i autobusom stižu u sledećem ažuriranju.",
    "see_all": "Pogledaj sve"
  },
  "map": {
    "all_places": "Sva mesta",
    "download_pack": "Preuzmi paket za Beograd",
    "downloading": "Preuzimanje Beograda…",
    "download_failed": "Preuzimanje nije uspelo",
    "try_again": "Pokušaj ponovo",
    "recenter": "Centriraj na moju lokaciju",
    "tracking_on": "Zaustavi praćenje",
    "tracking_off": "Pokreni praćenje",
    "min_walk": "{n} min pešaka"
  },
  "poi": {
    "back": "Nazad",
    "save": "Sačuvaj",
    "saved": "Sačuvano",
    "open_now": "Otvoreno",
    "closed": "Zatvoreno",
    "verified_on": "Provereno {date}",
    "editor_pick": "Izbor urednika",
    "wikipedia": "Vikipedija",
    "osm": "OpenStreetMap",
    "official": "Zvanično",
    "reviews": "{n} recenzija",
    "no_image": "Nema fotografije",
    "not_found": "Nije pronađeno",
    "address": "Adresa",
    "hours": "Radno vreme",
    "price": "Cena",
    "tags": "Oznake"
  },
  "itinerary": {
    "back": "Nazad",
    "show_on_map": "Prikaži na mapi",
    "complete": "Ruta završena",
    "next_stop": "Sledeća stanica",
    "stops": "{n} stanica",
    "route_unavailable": "Geometrija rute nije dostupna — koraci i dalje rade."
  },
  "saved": {
    "empty_title": "Još ništa nije sačuvano",
    "empty_body": "Dodirni oznaku na mestu da bi ga sačuvao ovde."
  },
  "trips": {
    "empty_title": "Izleti uskoro",
    "empty_body": "Novi Sad, Topola, Avala i još mnogo toga — sa info o prevozu — stižu u sledećem ažuriranju."
  },
  "settings": {
    "language": "Jezik",
    "language_en": "English",
    "language_sr": "Srpski",
    "currency": "Valuta",
    "currency_rsd": "RSD (srpski dinar)",
    "currency_rsd_eur": "RSD sa EUR",
    "offline_pack": "Paket za rad bez interneta",
    "gps": "GPS",
    "permission": "Dozvola",
    "tracking": "praćenje",
    "start": "Pokreni",
    "stop": "Zaustavi",
    "install": "Instaliraj Beograd vodič",
    "install_ios": "Dodirni Podeli, pa Dodaj na početni ekran.",
    "downloaded_today": "Danas",
    "downloaded_yesterday": "Juče",
    "downloaded_days": "Pre {n} dana"
  },
  "common": {
    "close": "Zatvori",
    "cancel": "Otkaži",
    "confirm": "Potvrdi",
    "loading": "Učitavanje…"
  }
}
```

- [ ] **Step 11: Commit**

```bash
git add src/app/core/i18n/ src/i18n/
git commit -m "feat(i18n): locale service + EN/SR-Latn UI strings"
```

---

## Task 5: HoursService — open-now via opening_hours.js

**Files:**
- Create: `src/app/core/hours/hours.service.ts`
- Create: `src/app/core/hours/hours.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/hours/hours.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { HoursService } from './hours.service';

describe('HoursService', () => {
  let svc: HoursService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(HoursService);
  });

  it('returns open during the listed window', () => {
    // Tuesday 14:00 — should be open under "Tu-Su 10:00-18:00"
    const tueAfternoon = new Date('2026-05-05T14:00:00');
    const result = svc.isOpenAt('Tu-Su 10:00-18:00', tueAfternoon);
    expect(result.state).toBe('open');
  });

  it('returns closed outside the window', () => {
    // Tuesday 22:00 — closed
    const tueLate = new Date('2026-05-05T22:00:00');
    const result = svc.isOpenAt('Tu-Su 10:00-18:00', tueLate);
    expect(result.state).toBe('closed');
  });

  it('returns closed on a day not in the rule', () => {
    // Monday — closed under "Tu-Su"
    const mon = new Date('2026-05-04T14:00:00');
    const result = svc.isOpenAt('Tu-Su 10:00-18:00', mon);
    expect(result.state).toBe('closed');
  });

  it('handles overnight hours (open through midnight)', () => {
    // Friday 02:00 should be OPEN under "Th-Sa 23:00-05:00"
    const friEarly = new Date('2026-05-08T02:00:00');
    const result = svc.isOpenAt('Th-Sa 23:00-05:00', friEarly);
    expect(result.state).toBe('open');
  });

  it('returns unknown for unparseable grammar', () => {
    const result = svc.isOpenAt('by appointment only', new Date('2026-05-05T14:00:00'));
    expect(result.state).toBe('unknown');
  });

  it('returns unknown for empty input', () => {
    const result = svc.isOpenAt('', new Date());
    expect(result.state).toBe('unknown');
  });

  it('returns unknown for "Always open" free-text', () => {
    // Existing dataset uses this phrasing; should yield unknown, not throw.
    const result = svc.isOpenAt('Always open', new Date());
    expect(result.state).toBe('unknown');
  });

  it('exposes a 7x24 weekly grid', () => {
    const grid = svc.weeklyGrid('Tu-Su 10:00-18:00');
    expect(grid).toHaveLength(7);
    expect(grid[0]).toHaveLength(24);
    // Tuesday (index 1 if Sunday=0): hour 14 should be open
    expect(grid[2][14]).toBe(true);
    // Tuesday hour 09 should be closed
    expect(grid[2][9]).toBe(false);
    // Monday — fully closed
    expect(grid[1].every(v => v === false)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- --run src/app/core/hours/hours.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

Create `src/app/core/hours/hours.service.ts`:
```ts
import { Injectable } from '@angular/core';
// opening_hours has no first-class types; the default export is a constructor.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import OpeningHoursLib from 'opening_hours';

export type IsOpenState = 'open' | 'closed' | 'unknown';

export interface IsOpenResult {
  state: IsOpenState;
  /** When the current state ends, if computable (e.g. "open until 18:00"). */
  until?: Date;
}

@Injectable({ providedIn: 'root' })
export class HoursService {
  /** Single source of truth for "is this place open at time T". */
  isOpenAt(raw: string, at: Date): IsOpenResult {
    const oh = this.parse(raw);
    if (!oh) return { state: 'unknown' };
    try {
      const isOpen = oh.getState(at);
      const next = oh.getNextChange(at);
      return { state: isOpen ? 'open' : 'closed', until: next ?? undefined };
    } catch {
      return { state: 'unknown' };
    }
  }

  /**
   * Returns a 7x24 boolean grid keyed [weekday][hour] using JS weekdays
   * (0=Sunday). Each cell is true iff the place is open at the start of that
   * hour during a typical week. Used by the hours heatmap chart.
   */
  weeklyGrid(raw: string): boolean[][] {
    const oh = this.parse(raw);
    const grid: boolean[][] = Array.from({ length: 7 }, () => new Array<boolean>(24).fill(false));
    if (!oh) return grid;

    // Anchor on the most recent Sunday at 00:00 local; iterate 7×24 hourly.
    const now = new Date();
    const sunday = new Date(now);
    sunday.setHours(0, 0, 0, 0);
    sunday.setDate(sunday.getDate() - sunday.getDay());

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const t = new Date(sunday);
        t.setDate(sunday.getDate() + d);
        t.setHours(h, 0, 0, 0);
        try {
          grid[d][h] = oh.getState(t);
        } catch {
          grid[d][h] = false;
        }
      }
    }
    return grid;
  }

  private parse(raw: string): InstanceType<typeof OpeningHoursLib> | null {
    if (!raw || raw.trim().length === 0) return null;
    try {
      return new OpeningHoursLib(raw);
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- --run src/app/core/hours/hours.service.spec.ts`
Expected: PASS. If `OpeningHoursLib` types complain, add `// @ts-expect-error opening_hours has no types` on the import line.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/hours/
git commit -m "feat(hours): wrap opening_hours.js with conservative isOpenAt + weeklyGrid"
```

---

## Task 6: SavedService — IDB-backed favourites

**Files:**
- Create: `src/app/core/saved/saved.service.ts`
- Create: `src/app/core/saved/saved.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/saved/saved.service.spec.ts`:
```ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { SavedService } from './saved.service';

describe('SavedService', () => {
  let svc: SavedService;

  beforeEach(async () => {
    // Reset the fake DB between tests.
    const dbs = await indexedDB.databases();
    for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(SavedService);
    await svc.ready();
  });

  it('starts empty', () => {
    expect(svc.list()).toEqual([]);
    expect(svc.isSaved('x')).toBe(false);
  });

  it('adds, lists, and persists', async () => {
    await svc.add('kalemegdan');
    expect(svc.isSaved('kalemegdan')).toBe(true);
    expect(svc.list().map(s => s.poiId)).toEqual(['kalemegdan']);
  });

  it('removes', async () => {
    await svc.add('kalemegdan');
    await svc.remove('kalemegdan');
    expect(svc.isSaved('kalemegdan')).toBe(false);
    expect(svc.list()).toEqual([]);
  });

  it('does not duplicate when added twice', async () => {
    await svc.add('kalemegdan');
    await svc.add('kalemegdan');
    expect(svc.list()).toHaveLength(1);
  });

  it('persists across instances', async () => {
    await svc.add('kalemegdan');
    const fresh = TestBed.inject(SavedService);
    // Singleton — same instance, but verify reload from IDB.
    await fresh.reload();
    expect(fresh.isSaved('kalemegdan')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- --run src/app/core/saved/saved.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the service**

Create `src/app/core/saved/saved.service.ts`:
```ts
import { Injectable, signal } from '@angular/core';
import { get, set } from 'idb-keyval';
import type { SavedPlace } from '../../data/types';

const KEY = 'beograde:saved:v1';

@Injectable({ providedIn: 'root' })
export class SavedService {
  readonly list = signal<SavedPlace[]>([]);
  private initial: Promise<void>;

  constructor() {
    this.initial = this.reload();
  }

  ready(): Promise<void> {
    return this.initial;
  }

  async reload(): Promise<void> {
    const stored = (await get<SavedPlace[]>(KEY)) ?? [];
    this.list.set(stored);
  }

  isSaved(poiId: string): boolean {
    return this.list().some(s => s.poiId === poiId);
  }

  async add(poiId: string, note?: string): Promise<void> {
    if (this.isSaved(poiId)) return;
    const next: SavedPlace[] = [...this.list(), { poiId, savedAt: Date.now(), note }];
    this.list.set(next);
    await set(KEY, next);
  }

  async remove(poiId: string): Promise<void> {
    const next = this.list().filter(s => s.poiId !== poiId);
    this.list.set(next);
    await set(KEY, next);
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- --run src/app/core/saved/saved.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/saved/
git commit -m "feat(saved): IDB-backed favourites service"
```

---

## Task 7: ItineraryProgressService

**Files:**
- Create: `src/app/core/itinerary-progress/itinerary-progress.service.ts`
- Create: `src/app/core/itinerary-progress/itinerary-progress.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/itinerary-progress/itinerary-progress.service.spec.ts`:
```ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ItineraryProgressService } from './itinerary-progress.service';

describe('ItineraryProgressService', () => {
  let svc: ItineraryProgressService;

  beforeEach(async () => {
    const dbs = await indexedDB.databases();
    for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ItineraryProgressService);
    await svc.ready();
  });

  it('has no progress before start', () => {
    expect(svc.activeId()).toBeNull();
    expect(svc.progressFor('history-walk')).toBeUndefined();
  });

  it('starts an itinerary', async () => {
    await svc.start('history-walk');
    expect(svc.activeId()).toBe('history-walk');
    const p = svc.progressFor('history-walk');
    expect(p).toBeDefined();
    expect(p?.reachedStopIds).toEqual([]);
  });

  it('marks a stop reached idempotently', async () => {
    await svc.start('history-walk');
    await svc.markReached('history-walk', 'kalemegdan');
    await svc.markReached('history-walk', 'kalemegdan');
    expect(svc.progressFor('history-walk')?.reachedStopIds).toEqual(['kalemegdan']);
  });

  it('clears progress', async () => {
    await svc.start('history-walk');
    await svc.markReached('history-walk', 'kalemegdan');
    await svc.clear('history-walk');
    expect(svc.activeId()).toBeNull();
    expect(svc.progressFor('history-walk')).toBeUndefined();
  });

  it('persists across reload', async () => {
    await svc.start('history-walk');
    await svc.markReached('history-walk', 'kalemegdan');
    await svc.reload();
    expect(svc.progressFor('history-walk')?.reachedStopIds).toEqual(['kalemegdan']);
    expect(svc.activeId()).toBe('history-walk');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- --run src/app/core/itinerary-progress/itinerary-progress.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the service**

Create `src/app/core/itinerary-progress/itinerary-progress.service.ts`:
```ts
import { Injectable, computed, signal } from '@angular/core';
import { get, set, del } from 'idb-keyval';
import type { ItineraryProgress } from '../../data/types';

const ALL_KEY = 'beograde:itinerary:progress:all:v1';
const ACTIVE_KEY = 'beograde:itinerary:active:v1';

@Injectable({ providedIn: 'root' })
export class ItineraryProgressService {
  private readonly map = signal<Record<string, ItineraryProgress>>({});
  readonly activeId = signal<string | null>(null);
  private initial: Promise<void>;

  readonly active = computed<ItineraryProgress | null>(() => {
    const id = this.activeId();
    return id ? this.map()[id] ?? null : null;
  });

  constructor() {
    this.initial = this.reload();
  }

  ready(): Promise<void> {
    return this.initial;
  }

  async reload(): Promise<void> {
    const stored = (await get<Record<string, ItineraryProgress>>(ALL_KEY)) ?? {};
    const active = (await get<string>(ACTIVE_KEY)) ?? null;
    this.map.set(stored);
    this.activeId.set(active);
  }

  progressFor(itineraryId: string): ItineraryProgress | undefined {
    return this.map()[itineraryId];
  }

  async start(itineraryId: string): Promise<void> {
    const existing = this.map()[itineraryId];
    if (!existing) {
      const fresh: ItineraryProgress = {
        itineraryId,
        startedAt: Date.now(),
        reachedStopIds: [],
        lastUpdatedAt: Date.now(),
      };
      const next = { ...this.map(), [itineraryId]: fresh };
      this.map.set(next);
      await set(ALL_KEY, next);
    }
    this.activeId.set(itineraryId);
    await set(ACTIVE_KEY, itineraryId);
  }

  async markReached(itineraryId: string, poiId: string): Promise<void> {
    const cur = this.map()[itineraryId];
    if (!cur) return;
    if (cur.reachedStopIds.includes(poiId)) return;
    const updated: ItineraryProgress = {
      ...cur,
      reachedStopIds: [...cur.reachedStopIds, poiId],
      lastUpdatedAt: Date.now(),
    };
    const next = { ...this.map(), [itineraryId]: updated };
    this.map.set(next);
    await set(ALL_KEY, next);
  }

  async clear(itineraryId: string): Promise<void> {
    const next = { ...this.map() };
    delete next[itineraryId];
    this.map.set(next);
    await set(ALL_KEY, next);
    if (this.activeId() === itineraryId) {
      this.activeId.set(null);
      await del(ACTIVE_KEY);
    }
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- --run src/app/core/itinerary-progress/itinerary-progress.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/itinerary-progress/
git commit -m "feat(progress): persisted itinerary progress with active-id signal"
```

---

## Task 8: Migrate POI + itinerary data to the new schema

**Files:**
- Create: `scripts/migrate-pois.mjs`
- Modify: `src/assets/pois.json` (in-place rewrite by the script)
- Modify: `src/app/data/itineraries.ts` (bilingual fields, hand-edited)
- Modify: `src/app/data/pois.ts` (loader stays, types align)

- [ ] **Step 1: Write the migration script**

Create `scripts/migrate-pois.mjs`:
```js
#!/usr/bin/env node
/*
 * One-shot migration of src/assets/pois.json from v1 (free-text) to v2
 * (bilingual + structured hours + provenance + editorial confidence).
 *
 * Idempotent — running twice on a v2 file leaves it unchanged.
 *
 * Hours are mapped from common free-text phrases to OSM opening_hours grammar.
 * Anything we can't parse becomes raw === '' and HoursService returns 'unknown'.
 *
 * sr_lat is identical to en for this pass; SR-Latin content is hand-translated
 * later. sr_cyr is left empty in Phase 1a (Cyrillic toggle hidden).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve('src/assets/pois.json');
const raw = readFileSync(path, 'utf8');
const list = JSON.parse(raw);

const HOURS_MAP = {
  'Open 24h (museums 10:00–17:00)': '24/7; museums Mo-Su 10:00-17:00',
  '07:00–22:00': 'Mo-Su 07:00-22:00',
  'Restaurants typically 11:00–01:00': 'Mo-Su 11:00-01:00',
  '12:00–00:00': 'Mo-Su 12:00-24:00',
  '23:00–05:00': 'Mo-Su 23:00-05:00',
  '18:00–02:00': 'Mo-Su 18:00-02:00',
  'Always open': '24/7',
  'Tue–Sun 10:00–18:00 (Thu until 20:00)': 'Tu-Su 10:00-18:00; Th 10:00-20:00',
  'Tue–Sun 10:00–18:00': 'Tu-Su 10:00-18:00',
  'Outside prayer times': '',
  'Tue–Sat 10:00–17:00, Sun 10:00–14:00': 'Tu-Sa 10:00-17:00; Su 10:00-14:00',
  '08:00–20:00 (summer)': 'Mo-Su 08:00-20:00',
  '10:00–22:00 (summer)': 'Mo-Su 10:00-22:00',
  '08:00–23:00': 'Mo-Su 08:00-23:00',
  '07:00–00:00': 'Mo-Su 07:00-24:00',
  '08:00–00:00': 'Mo-Su 08:00-24:00',
  'Bulevar kralja Aleksandra': '',
  '08:00–19:00': 'Mo-Su 08:00-19:00',
  'Tue–Sat 10:00–17:00': 'Tu-Sa 10:00-17:00',
  'Fri–Sat 23:00–08:00': 'Fr-Sa 23:00-08:00',
  '08:00–20:00': 'Mo-Su 08:00-20:00',
  '09:00–23:00': 'Mo-Su 09:00-23:00',
  '09:00–20:00': 'Mo-Su 09:00-20:00',
  'Variable': '',
};

function bilingual(s) {
  return { en: s, sr_lat: s, sr_cyr: '' };
}

function isV2(p) {
  return p && p.name && typeof p.name === 'object' && 'en' in p.name;
}

const today = new Date().toISOString().slice(0, 10);

const migrated = list.map(p => {
  if (isV2(p)) return p;

  const hoursRaw = HOURS_MAP[p.hours] ?? '';
  const out = {
    id: p.id,
    region: 'city',
    category: p.category,
    name: bilingual(p.name),
    description: bilingual(p.description),
    address: bilingual(p.address),
    lng: p.lng,
    lat: p.lat,
    tags: p.tags ?? [],
    images: [],
    verifiedAt: today,
    sources: [],
    reliability: {
      score: 0,
      checks: { wikipedia: false, osm: false, official: false, crowdsourced: false },
    },
    editorialConfidence: 'high',
  };
  if (hoursRaw) out.hours = { raw: hoursRaw };
  if (p.priceRange) out.pricing = { tier: p.priceRange };
  return out;
});

writeFileSync(path, JSON.stringify(migrated, null, 2) + '\n');
console.log(`migrated ${migrated.length} POIs (idempotent)`);
```

- [ ] **Step 2: Run the migration**

Run:
```bash
node scripts/migrate-pois.mjs
```
Expected: prints `migrated 32 POIs (idempotent)`. The file `src/assets/pois.json` is now in v2 schema.

- [ ] **Step 3: Verify migration is idempotent**

Run:
```bash
node scripts/migrate-pois.mjs
node scripts/migrate-pois.mjs
```
Expected: no diff in `src/assets/pois.json` after the second run.
```bash
git diff --stat src/assets/pois.json
```

- [ ] **Step 4: Update the POI loader to validate the new shape**

Replace `src/app/data/pois.ts` with:
```ts
import { POI } from './types';
import poisData from '../../assets/pois.json';

// Cast — runtime structure is enforced by scripts/migrate-pois.mjs.
export const POIS: POI[] = poisData as unknown as POI[];

export const POI_BY_ID = new Map<string, POI>(POIS.map((p) => [p.id, p]));

export function getPoi(id: string): POI | undefined {
  return POI_BY_ID.get(id);
}

export const CATEGORY_LABELS: Record<POI['category'], string> = {
  sight: 'Sights',
  cuisine: 'Cuisine',
  nightlife: 'Nightlife',
  cafe: 'Cafés',
  museum: 'Museums',
  viewpoint: 'Viewpoints',
  park: 'Parks',
};

export const CATEGORY_ICONS: Record<POI['category'], string> = {
  sight: 'account_balance',
  cuisine: 'restaurant',
  nightlife: 'nightlife',
  cafe: 'local_cafe',
  museum: 'museum',
  viewpoint: 'visibility',
  park: 'park',
};
```

- [ ] **Step 5: Migrate itineraries.ts to bilingual by hand**

Replace `src/app/data/itineraries.ts`. For brevity, only the first itinerary is shown verbatim — apply the same transformation to all six (every title/subtitle/notes wrapped with `{ en: ..., sr_lat: ..., sr_cyr: '' }`):

```ts
import { Itinerary, Bilingual } from './types';

const bg = (en: string, sr: string = en): Bilingual => ({ en, sr_lat: sr, sr_cyr: '' });

export const ITINERARIES: Itinerary[] = [
  {
    id: 'history-walk',
    title: bg('Old Belgrade in Half a Day', 'Stari Beograd za pola dana'),
    subtitle: bg('Fortress, kafanas, and the cobbles in between.', 'Tvrđava, kafane i kaldrma između.'),
    durationMinutes: 240,
    vibe: ['history', 'walking', 'first-time'],
    geometryUrl: 'assets/itineraries/history-walk.geojson',
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 60, notes: bg('Start at the upper town. Find the Victor monument.') },
      { poiId: 'bajrakli-mosque', arrivalOffsetMinutes: 70, durationMinutes: 15 },
      { poiId: 'princess-ljubica', arrivalOffsetMinutes: 95, durationMinutes: 30 },
      { poiId: 'kafana-question-mark', arrivalOffsetMinutes: 130, durationMinutes: 45, notes: bg('Ćevapi and a half-litre of beer.') },
      { poiId: 'knez-mihailova', arrivalOffsetMinutes: 180, durationMinutes: 30 },
      { poiId: 'republic-square', arrivalOffsetMinutes: 215, durationMinutes: 25 },
    ],
  },
  {
    id: 'foodie-crawl',
    title: bg('Foodie Crawl Through Dorćol', 'Gastro tura kroz Dorćol'),
    subtitle: bg('Coffee, brunch, kafana, cake, late drinks.'),
    durationMinutes: 480,
    vibe: ['foodie', 'walking', 'evening'],
    geometryUrl: 'assets/itineraries/foodie-crawl.geojson',
    stops: [
      { poiId: 'magistrala', arrivalOffsetMinutes: 0, durationMinutes: 30, notes: bg('Flat white to start.') },
      { poiId: 'supermarket-dorcol', arrivalOffsetMinutes: 45, durationMinutes: 75, notes: bg('Late brunch in the courtyard.') },
      { poiId: 'smokvica', arrivalOffsetMinutes: 150, durationMinutes: 45 },
      { poiId: 'hotel-moskva', arrivalOffsetMinutes: 240, durationMinutes: 45, notes: bg('Moskva Šnit and a coffee.') },
      { poiId: 'skadarlija', arrivalOffsetMinutes: 320, durationMinutes: 90, notes: bg('Kafana dinner with live tamburica.') },
      { poiId: 'cetinjska', arrivalOffsetMinutes: 420, durationMinutes: 60, notes: bg('Last drink in the courtyard.') },
    ],
  },
  {
    id: 'riverside-splavovi',
    title: bg('Riverside Sunset to Splavovi', 'Zalazak pored reke do splavova'),
    subtitle: bg('Walk the Sava, eat by the water, dance on it.'),
    durationMinutes: 360,
    vibe: ['nightlife', 'summer', 'date'],
    geometryUrl: 'assets/itineraries/riverside-splavovi.geojson',
    stops: [
      { poiId: 'belgrade-waterfront', arrivalOffsetMinutes: 0, durationMinutes: 45 },
      { poiId: 'brankov-most', arrivalOffsetMinutes: 50, durationMinutes: 20, notes: bg('Sunset shot from the bridge.') },
      { poiId: 'beton-hala', arrivalOffsetMinutes: 80, durationMinutes: 120, notes: bg('Long dinner, watch the lights come on.') },
      { poiId: 'savamala', arrivalOffsetMinutes: 210, durationMinutes: 60, notes: bg('Pre-game drinks in a gallery bar.') },
      { poiId: 'splavovi', arrivalOffsetMinutes: 280, durationMinutes: 80, notes: bg('Pick a splav by the music spilling out.') },
    ],
  },
  {
    id: 'family-day',
    title: bg('Family Day Outdoors', 'Porodični dan napolju'),
    subtitle: bg('Big space, small queues, ice cream stops.'),
    durationMinutes: 360,
    vibe: ['family', 'kids', 'outdoor'],
    geometryUrl: 'assets/itineraries/family-day.geojson',
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 90 },
      { poiId: 'zoo-belgrade', arrivalOffsetMinutes: 95, durationMinutes: 90 },
      { poiId: 'knez-mihailova', arrivalOffsetMinutes: 195, durationMinutes: 45, notes: bg('Ice cream and a street performer.') },
      { poiId: 'tasmajdan-park', arrivalOffsetMinutes: 250, durationMinutes: 60 },
      { poiId: 'tesla-museum', arrivalOffsetMinutes: 320, durationMinutes: 40, notes: bg('Time the coil demo.') },
    ],
  },
  {
    id: 'rainy-day',
    title: bg('Rainy Day Indoors', 'Kišni dan u zatvorenom'),
    subtitle: bg('Two great museums, two great cafés, no umbrella drama.'),
    durationMinutes: 300,
    vibe: ['rainy', 'museums', 'indoor'],
    geometryUrl: 'assets/itineraries/rainy-day.geojson',
    stops: [
      { poiId: 'national-museum', arrivalOffsetMinutes: 0, durationMinutes: 90 },
      { poiId: 'hotel-moskva', arrivalOffsetMinutes: 100, durationMinutes: 45 },
      { poiId: 'tesla-museum', arrivalOffsetMinutes: 160, durationMinutes: 60 },
      { poiId: 'manaks-house', arrivalOffsetMinutes: 230, durationMinutes: 35 },
      { poiId: 'smokvica', arrivalOffsetMinutes: 270, durationMinutes: 30 },
    ],
  },
  {
    id: 'viewpoint-sunset',
    title: bg('Three Viewpoints, One Sunset', 'Tri vidikovca, jedan zalazak'),
    subtitle: bg('Catch Belgrade from above, water-level, and across the Sava.'),
    durationMinutes: 240,
    vibe: ['viewpoint', 'sunset', 'photography'],
    geometryUrl: 'assets/itineraries/viewpoint-sunset.geojson',
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 60, notes: bg('Upper-town walls, golden hour.') },
      { poiId: 'brankov-most', arrivalOffsetMinutes: 70, durationMinutes: 30 },
      { poiId: 'zemun-quay', arrivalOffsetMinutes: 110, durationMinutes: 60 },
      { poiId: 'gardos-tower', arrivalOffsetMinutes: 175, durationMinutes: 50, notes: bg('Climb for the final viewpoint.') },
    ],
  },
];

export const ITINERARY_BY_ID = new Map<string, Itinerary>(
  ITINERARIES.map((i) => [i.id, i]),
);

export function getItinerary(id: string): Itinerary | undefined {
  return ITINERARY_BY_ID.get(id);
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `data/types.ts`, `data/pois.ts`, `data/itineraries.ts` all type-check. Existing component files (`features/*`) will still report errors that reference legacy fields — Tasks 14–17 fix them.

- [ ] **Step 7: Commit**

```bash
git add scripts/migrate-pois.mjs src/assets/pois.json src/app/data/pois.ts src/app/data/itineraries.ts
git commit -m "feat(data): migrate POIs + itineraries to bilingual + structured hours"
```

---

## Task 9: UI primitives — i18n pipe, Card, Chip, HeroCard, TwoRiversMark

**Files:**
- Create: `src/app/ui/i18n-text/i18n-text.pipe.ts`
- Create: `src/app/ui/i18n-text/i18n-text.pipe.spec.ts`
- Create: `src/app/ui/card/card.component.ts`
- Create: `src/app/ui/chip/chip.component.ts`
- Create: `src/app/ui/chip/chip.component.spec.ts`
- Create: `src/app/ui/hero-card/hero-card.component.ts`
- Create: `src/app/ui/two-rivers-mark/two-rivers-mark.component.ts`

- [ ] **Step 1: Write the failing pipe test**

Create `src/app/ui/i18n-text/i18n-text.pipe.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { I18nTextPipe } from './i18n-text.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

describe('I18nTextPipe', () => {
  let pipe: I18nTextPipe;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
    pipe = new I18nTextPipe(i18n);
  });

  it('returns English by default', () => {
    i18n.setLocale({ locale: 'en', script: 'Latn' });
    expect(pipe.transform({ en: 'Hi', sr_lat: 'Zdravo', sr_cyr: '' })).toBe('Hi');
  });

  it('returns Serbian Latin when locale is sr', () => {
    i18n.setLocale({ locale: 'sr', script: 'Latn' });
    expect(pipe.transform({ en: 'Hi', sr_lat: 'Zdravo', sr_cyr: '' })).toBe('Zdravo');
  });

  it('returns empty string for null/undefined inputs', () => {
    expect(pipe.transform(null as never)).toBe('');
    expect(pipe.transform(undefined as never)).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- --run src/app/ui/i18n-text/i18n-text.pipe.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the pipe**

Create `src/app/ui/i18n-text/i18n-text.pipe.ts`:
```ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { pick } from '../../core/i18n/i18n';
import type { Bilingual } from '../../data/types';

@Pipe({ name: 'i18nText', standalone: true, pure: false })
export class I18nTextPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(value: Bilingual | null | undefined): string {
    if (!value) return '';
    return pick(value, this.i18n.locale());
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- --run src/app/ui/i18n-text/i18n-text.pipe.spec.ts`
Expected: PASS.

- [ ] **Step 5: Implement the Card primitive**

Create `src/app/ui/card/card.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

type Variant = 'plain' | 'elevated' | 'concrete';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [ngClass]="'card-' + variant()">
      <ng-content />
    </div>
  `,
  styles: [`
    .card {
      background: var(--surface);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      transition: transform 120ms ease;
    }
    .card-elevated { border-radius: var(--radius-card-lg); }
    .card-concrete {
      background:
        repeating-linear-gradient(135deg, transparent 0 18px, rgba(0,0,0,0.02) 18px 19px),
        var(--concrete);
      color: white;
    }
    .card:active { transform: scale(0.99); }
  `],
})
export class CardComponent {
  variant = input<Variant>('plain');
}
```

- [ ] **Step 6: Implement the Chip primitive**

Create `src/app/ui/chip/chip.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

type ChipVariant =
  | 'filter-active'
  | 'filter-idle'
  | 'verified'      // green check (Wikipedia / OSM / Official)
  | 'editor-pick'   // accent-soft (high editorial confidence)
  | 'reviews'       // outline, volume signal
  | 'open-now'      // good
  | 'closed'        // neutral
  | 'transit';      // tram-red

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [ngClass]="'chip-' + variant()" role="status">
      <ng-content />
    </span>
  `,
  styles: [`
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 4px 9px;
      border-radius: var(--radius-pill);
      white-space: nowrap;
      line-height: 1;
    }
    .chip-filter-active { background: var(--ink); color: white; }
    .chip-filter-idle { background: transparent; color: var(--ink-2); border: 1px solid rgba(0,0,0,0.1); }
    .chip-verified { background: var(--good-soft); color: var(--good); }
    .chip-editor-pick { background: var(--accent-soft); color: var(--accent); }
    .chip-reviews { background: transparent; color: var(--ink-2); border: 1px solid rgba(0,0,0,0.1); }
    .chip-open-now { background: var(--good-soft); color: var(--good); }
    .chip-closed { background: rgba(0,0,0,0.05); color: var(--ink-2); }
    .chip-transit { background: var(--transit-red-soft); color: var(--transit-red); }
  `],
})
export class ChipComponent {
  variant = input.required<ChipVariant>();
}
```

- [ ] **Step 7: Write a brief Chip render test**

Create `src/app/ui/chip/chip.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ChipComponent } from './chip.component';

@Component({ standalone: true, imports: [ChipComponent], template: `<app-chip variant="verified">WIKI</app-chip>` })
class Host {}

describe('ChipComponent', () => {
  it('renders with the requested variant class', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    const el = fix.nativeElement.querySelector('.chip');
    expect(el).toBeTruthy();
    expect(el.classList.contains('chip-verified')).toBe(true);
    expect(el.textContent).toContain('WIKI');
  });
});
```

- [ ] **Step 8: Run the chip test**

Run: `npm test -- --run src/app/ui/chip/chip.component.spec.ts`
Expected: PASS.

- [ ] **Step 9: Implement the HeroCard**

Create `src/app/ui/hero-card/hero-card.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="hero">
      <div class="hero-bg"></div>
      <div class="hero-fg">
        <div class="hero-eyebrow">{{ eyebrow() }}</div>
        <h2 class="hero-title">{{ title() }}</h2>
        <p class="hero-meta">{{ meta() }}</p>
      </div>
    </article>
  `,
  styles: [`
    .hero {
      position: relative;
      border-radius: var(--radius-card-lg);
      overflow: hidden;
      aspect-ratio: 16 / 9;
      box-shadow: var(--shadow-card);
      color: white;
    }
    .hero-bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(80% 80% at 80% 20%, rgba(255,255,255,0.35), transparent 60%),
        linear-gradient(135deg, var(--river) 0%, var(--accent) 60%, var(--fortress-deep) 100%);
    }
    .hero-fg { position: relative; z-index: 1; padding: 18px 18px 16px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
    .hero-eyebrow { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.92; }
    .hero-title { font-size: 22px; line-height: 1.05; margin: 6px 0 0; max-width: 80%; }
    .hero-meta { font-size: 12px; opacity: 0.92; margin: 0; }
  `],
})
export class HeroCardComponent {
  eyebrow = input.required<string>();
  title = input.required<string>();
  meta = input<string>('');
}
```

- [ ] **Step 10: Implement the Two-Rivers Mark**

Create `src/app/ui/two-rivers-mark/two-rivers-mark.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-two-rivers-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 4 C 12 14, 12 18, 16 28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M28 4 C 20 14, 20 18, 16 28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="16" cy="28" r="2" fill="currentColor"/>
    </svg>
  `,
})
export class TwoRiversMarkComponent {
  size = input<number>(24);
}
```

- [ ] **Step 11: Lint passes**

Run: `npm run lint`
Expected: passes for the new files. (Existing component lint failures from Task 3 are not yet fixed — they'll be cleared in later tasks.)

- [ ] **Step 12: Commit**

```bash
git add src/app/ui/
git commit -m "feat(ui): add Card / Chip / HeroCard / TwoRiversMark primitives + i18nText pipe"
```

---

## Task 10: BottomNav primitive

**Files:**
- Create: `src/app/ui/bottom-nav/bottom-nav.component.ts`
- Create: `src/app/ui/bottom-nav/bottom-nav.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/ui/bottom-nav/bottom-nav.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BottomNavComponent, NavTab } from './bottom-nav.component';

@Component({
  standalone: true,
  imports: [BottomNavComponent],
  template: `<app-bottom-nav [tabs]="tabs" [activeId]="active" />`,
})
class Host {
  tabs: NavTab[] = [
    { id: 'home', label: 'Home', icon: 'home', route: '/home' },
    { id: 'map', label: 'Map', icon: 'map', route: '/map' },
  ];
  active: NavTab['id'] = 'home';
}

describe('BottomNavComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] });
  });

  it('renders one tab per input entry', () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    expect(fix.nativeElement.querySelectorAll('.nav-tab').length).toBe(2);
  });

  it('marks the active tab with aria-current=page', () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    const homeTab = fix.nativeElement.querySelector('.nav-tab[data-id="home"]');
    const mapTab = fix.nativeElement.querySelector('.nav-tab[data-id="map"]');
    expect(homeTab.getAttribute('aria-current')).toBe('page');
    expect(mapTab.getAttribute('aria-current')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- --run src/app/ui/bottom-nav/bottom-nav.component.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

Create `src/app/ui/bottom-nav/bottom-nav.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface NavTab {
  id: 'home' | 'map' | 'routes' | 'trips' | 'saved';
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav" role="navigation" aria-label="Primary">
      <ul class="nav-list">
        @for (tab of tabs(); track tab.id) {
          <li>
            <a class="nav-tab"
               [attr.data-id]="tab.id"
               [routerLink]="tab.route"
               [class.is-active]="tab.id === activeId()"
               [attr.aria-current]="tab.id === activeId() ? 'page' : null">
              <span class="material-symbols-outlined nav-icon" aria-hidden="true">{{ tab.icon }}</span>
              <span class="nav-label">{{ tab.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    :host { display: block; }
    .nav {
      background: rgba(255, 248, 241, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: var(--shadow-nav);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .nav-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); }
    .nav-tab {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; padding: 8px 4px;
      color: var(--ink-3);
      text-decoration: none;
      min-height: 56px;
      transition: color var(--motion-tab);
    }
    .nav-tab.is-active { color: var(--accent); }
    .nav-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 8px; }
    .nav-icon { font-size: 22px; }
    .nav-label { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  `],
})
export class BottomNavComponent {
  tabs = input.required<NavTab[]>();
  activeId = input.required<NavTab['id']>();
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- --run src/app/ui/bottom-nav/bottom-nav.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/ui/bottom-nav/
git commit -m "feat(ui): add BottomNav primitive with 5-tab a11y semantics"
```

---

## Task 11: Charts — itinerary timeline, hours heatmap, distance progress

**Files:**
- Create: `src/app/ui/charts/itinerary-timeline.component.ts`
- Create: `src/app/ui/charts/hours-heatmap.component.ts`
- Create: `src/app/ui/charts/distance-progress.component.ts`
- Create: `src/app/ui/charts/distance-progress.component.spec.ts`

- [ ] **Step 1: Implement the itinerary timeline chart**

Create `src/app/ui/charts/itinerary-timeline.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface TimelineNode {
  label: string;
  arrivalOffsetMinutes: number;
  reached: boolean;
  isNext: boolean;
}

@Component({
  selector: 'app-itinerary-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="tl" role="group" [attr.aria-label]="ariaLabel()">
      <div class="tl-track" [style.--total-mins]="totalMinutes()">
        @for (n of nodes(); track $index) {
          <div class="tl-node"
               [style.--at]="n.arrivalOffsetMinutes / totalMinutes()"
               [class.is-reached]="n.reached"
               [class.is-next]="n.isNext"
               [attr.aria-label]="n.label + ' at ' + formatOffset(n.arrivalOffsetMinutes)">
            <span class="tl-dot"></span>
            <span class="tl-label">{{ n.label }}</span>
            <span class="tl-time">{{ formatOffset(n.arrivalOffsetMinutes) }}</span>
          </div>
        }
      </div>
    </figure>
  `,
  styles: [`
    :host { display: block; }
    .tl-track {
      position: relative;
      height: 88px;
      background: linear-gradient(90deg,
        rgba(199, 168, 121, 0.20) 0%,    /* dawn — sandstone */
        rgba(255, 227, 204, 0.25) 25%,   /* day — accent-soft */
        rgba(199, 168, 121, 0.20) 75%,   /* dusk — sandstone */
        rgba(58, 64, 86, 0.20) 100%      /* night */
      );
      border-radius: 12px;
      padding: 0 12px;
    }
    .tl-track::before {
      content: ""; position: absolute; left: 12px; right: 12px; top: 14px;
      height: 2px; background: rgba(0,0,0,0.10);
    }
    .tl-node {
      position: absolute; top: 8px;
      transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      left: calc(12px + (100% - 24px) * var(--at));
    }
    .tl-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: white; border: 2px solid var(--ink-3);
    }
    .tl-node.is-reached .tl-dot { background: var(--ink-3); border-color: var(--ink-3); }
    .tl-node.is-next .tl-dot { background: var(--accent); border-color: var(--accent); transform: scale(1.2); }
    .tl-label {
      font-size: 10px; font-weight: 600; color: var(--ink-2);
      max-width: 64px; text-align: center; line-height: 1.1;
    }
    .tl-node.is-next .tl-label { color: var(--accent); }
    .tl-time { font-size: 9px; color: var(--ink-3); font-feature-settings: "tnum"; }
  `],
})
export class ItineraryTimelineComponent {
  nodes = input.required<TimelineNode[]>();

  readonly totalMinutes = computed(() => {
    const ns = this.nodes();
    if (ns.length === 0) return 1;
    return Math.max(...ns.map(n => n.arrivalOffsetMinutes), 1);
  });

  readonly ariaLabel = computed(() => `Itinerary timeline with ${this.nodes().length} stops over ${this.totalMinutes()} minutes`);

  formatOffset(mins: number): string {
    if (mins === 0) return 'Start';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `+${m}m`;
    if (m === 0) return `+${h}h`;
    return `+${h}h${m}m`;
  }
}
```

- [ ] **Step 2: Implement the hours heatmap chart**

Create `src/app/ui/charts/hours-heatmap.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-hours-heatmap',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="hm" [attr.aria-label]="ariaLabel()">
      <div class="hm-grid" role="img">
        @for (row of grid(); let dayIdx = $index; track dayIdx) {
          <div class="hm-row">
            <span class="hm-day">{{ dayLabel(dayIdx) }}</span>
            @for (cell of row; let hourIdx = $index; track hourIdx) {
              <span class="hm-cell"
                    [ngClass]="{
                      'is-open': cell,
                      'is-now': dayIdx === todayWeekday() && hourIdx === currentHour()
                    }"
                    [title]="dayLabel(dayIdx) + ' ' + hourIdx + ':00 — ' + (cell ? 'open' : 'closed')"></span>
            }
          </div>
        }
      </div>
      <div class="hm-axis" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </figure>
  `,
  styles: [`
    :host { display: block; font-feature-settings: "tnum"; }
    .hm-grid { display: flex; flex-direction: column; gap: 3px; }
    .hm-row { display: grid; grid-template-columns: 32px repeat(24, 1fr); gap: 2px; align-items: center; }
    .hm-day { font-size: 10px; color: var(--ink-3); font-weight: 600; }
    .hm-cell {
      height: 14px;
      background: rgba(0,0,0,0.05);
      border-radius: 2px;
      transition: background 120ms;
    }
    .hm-cell.is-open { background: var(--accent-soft); }
    .hm-cell.is-now { outline: 2px solid var(--accent); outline-offset: 1px; }
    .hm-axis {
      display: grid;
      grid-template-columns: 32px repeat(4, 1fr) 0;
      margin-top: 6px;
      font-size: 9px;
      color: var(--ink-3);
    }
    .hm-axis span:first-child { grid-column: 1; }
    .hm-axis span:nth-child(2) { grid-column: 2 / 8; }
    .hm-axis span:nth-child(3) { grid-column: 8 / 14; }
    .hm-axis span:nth-child(4) { grid-column: 14 / 20; }
    .hm-axis span:nth-child(5) { grid-column: 20 / 26; text-align: right; }
  `],
})
export class HoursHeatmapComponent {
  /** 7×24 boolean grid; index 0 = Sunday. Computed by HoursService.weeklyGrid. */
  grid = input.required<boolean[][]>();

  readonly todayWeekday = computed(() => new Date().getDay());
  readonly currentHour = computed(() => new Date().getHours());

  dayLabel(idx: number): string {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx];
  }

  readonly ariaLabel = computed(() => {
    const open = this.grid().flat().filter(Boolean).length;
    return `Hours heatmap: open ${open} hours per typical week`;
  });
}
```

- [ ] **Step 3: Write the failing distance-progress test**

Create `src/app/ui/charts/distance-progress.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { DistanceProgressComponent } from './distance-progress.component';

@Component({
  standalone: true,
  imports: [DistanceProgressComponent],
  template: `<app-distance-progress [walkedMeters]="walked" [totalMeters]="total" />`,
})
class Host { walked = 250; total = 1000; }

describe('DistanceProgressComponent', () => {
  it('renders the percentage label', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    expect(fix.nativeElement.textContent).toContain('25%');
    expect(fix.nativeElement.textContent).toContain('250 m');
  });

  it('caps at 100% when walked exceeds total', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fix = TestBed.createComponent(Host);
    fix.componentInstance.walked = 1500;
    fix.componentInstance.total = 1000;
    fix.detectChanges();
    expect(fix.nativeElement.textContent).toContain('100%');
  });
});
```

- [ ] **Step 4: Implement the distance-progress component**

Create `src/app/ui/charts/distance-progress.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-distance-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dp" role="progressbar"
         [attr.aria-valuemin]="0"
         [attr.aria-valuemax]="totalMeters()"
         [attr.aria-valuenow]="cappedWalked()">
      <div class="dp-row">
        <span class="dp-label">{{ formatMeters(cappedWalked()) }} of {{ formatMeters(totalMeters()) }}</span>
        <span class="dp-pct">{{ pct() }}%</span>
      </div>
      <div class="dp-track">
        <div class="dp-fill" [style.width.%]="pct()"></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dp { font-feature-settings: "tnum"; }
    .dp-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-2); margin-bottom: 4px; }
    .dp-pct { color: var(--accent); font-weight: 700; }
    .dp-track { height: 4px; background: rgba(0,0,0,0.08); border-radius: 2px; overflow: hidden; }
    .dp-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 240ms ease; }
  `],
})
export class DistanceProgressComponent {
  walkedMeters = input<number>(0);
  totalMeters = input<number>(1);

  readonly cappedWalked = computed(() => Math.min(this.walkedMeters(), this.totalMeters()));
  readonly pct = computed(() => Math.round((this.cappedWalked() / Math.max(this.totalMeters(), 1)) * 100));

  formatMeters(m: number): string {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- --run src/app/ui/charts/distance-progress.component.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/ui/charts/
git commit -m "feat(charts): add itinerary timeline, hours heatmap, distance progress"
```

---

## Task 12: Routes restructure — add Home / Saved / Trips, default to Home

**Files:**
- Modify: `src/app/app.routes.ts`
- Create: `src/app/features/home/home.component.ts` (stub — fully built in Task 13)
- Create: `src/app/features/home/home.component.html` (stub)
- Create: `src/app/features/saved/saved.component.ts` (stub — Task 18)
- Create: `src/app/features/saved/saved.component.html` (stub)
- Create: `src/app/features/trips/trips.component.ts` (stub — Task 17)
- Create: `src/app/features/trips/trips.component.html` (stub)
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`

- [ ] **Step 1: Create stub Home / Saved / Trips components so the router compiles**

Create `src/app/features/home/home.component.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
})
export class HomeComponent {}
```

Create `src/app/features/home/home.component.html`:
```html
<section class="p-5"><h1>Home</h1><p>Coming together in Task 13.</p></section>
```

Create `src/app/features/saved/saved.component.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-saved',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved.component.html',
})
export class SavedComponent {}
```

Create `src/app/features/saved/saved.component.html`:
```html
<section class="p-5"><h1>Saved</h1><p>Built in Task 18.</p></section>
```

Create `src/app/features/trips/trips.component.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-trips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trips.component.html',
})
export class TripsComponent {}
```

Create `src/app/features/trips/trips.component.html`:
```html
<section class="p-5"><h1>Trips</h1><p>Built in Task 17.</p></section>
```

- [ ] **Step 2: Replace `app.routes.ts` with the 5-tab structure**

Replace `src/app/app.routes.ts` with:
```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    data: { tab: 'home' },
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent),
    data: { tab: 'map' },
  },
  {
    path: 'routes',
    loadComponent: () => import('./features/itinerary-list/itinerary-list.component').then(m => m.ItineraryListComponent),
    data: { tab: 'routes' },
  },
  {
    path: 'trips',
    loadComponent: () => import('./features/trips/trips.component').then(m => m.TripsComponent),
    data: { tab: 'trips' },
  },
  {
    path: 'saved',
    loadComponent: () => import('./features/saved/saved.component').then(m => m.SavedComponent),
    data: { tab: 'saved' },
  },
  {
    path: 'poi/:id',
    loadComponent: () => import('./features/poi-detail/poi-detail.component').then(m => m.PoiDetailComponent),
    data: { tab: 'map' },
  },
  {
    path: 'itinerary/:id',
    loadComponent: () => import('./features/itinerary-detail/itinerary-detail.component').then(m => m.ItineraryDetailComponent),
    data: { tab: 'routes' },
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    data: { tab: 'home' },
  },
  { path: '**', redirectTo: 'home' },
];
```

- [ ] **Step 3: Replace `app.ts` to use BottomNav with 5 tabs**

Replace `src/app/app.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { PwaInstallService } from './core/pwa-install.service';
import { I18nService } from './core/i18n/i18n.service';
import { BottomNavComponent, NavTab } from './ui/bottom-nav/bottom-nav.component';
import enStrings from '../i18n/en.json';
import srLatStrings from '../i18n/sr-Latn.json';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private router = inject(Router);
  protected readonly pwa = inject(PwaInstallService);
  protected readonly i18n = inject(I18nService);

  protected readonly tabs = computed<NavTab[]>(() => {
    const t = this.i18n.locale().locale === 'sr' ? srLatStrings.tabs : enStrings.tabs;
    return [
      { id: 'home', label: t.home, icon: 'home', route: '/home' },
      { id: 'map', label: t.map, icon: 'map', route: '/map' },
      { id: 'routes', label: t.routes, icon: 'route', route: '/routes' },
      { id: 'trips', label: t.trips, icon: 'directions_train', route: '/trips' },
      { id: 'saved', label: t.saved, icon: 'bookmark', route: '/saved' },
    ];
  });

  protected readonly dismissedInstallTip = signal(false);

  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
  );

  protected readonly activeTab = computed<NavTab['id']>(() => {
    this.navEnd();
    const child = this.deepestChild(this.router.routerState.root.snapshot);
    return (child?.data?.['tab'] as NavTab['id']) ?? 'home';
  });

  protected readonly showIosInstallTip = computed(
    () => this.pwa.isIos() && !this.pwa.isStandalone() && !this.dismissedInstallTip(),
  );

  private deepestChild(node: import('@angular/router').ActivatedRouteSnapshot): import('@angular/router').ActivatedRouteSnapshot {
    let current = node;
    while (current.firstChild) current = current.firstChild;
    return current;
  }
}
```

- [ ] **Step 4: Replace `app.html` to use the BottomNav primitive**

Replace `src/app/app.html` with:
```html
<div class="fixed inset-0 flex flex-col">
  <main class="flex-1 overflow-y-auto overscroll-contain relative">
    <router-outlet></router-outlet>
  </main>

  @if (showIosInstallTip()) {
    <div class="ios-tip">
      <span class="material-symbols-outlined" aria-hidden="true">ios_share</span>
      <div class="ios-tip-body">
        <strong>Install Beograde:</strong> tap Share, then <em>Add to Home Screen</em>.
      </div>
      <button type="button" (click)="dismissedInstallTip.set(true)" aria-label="Dismiss" class="ios-tip-close">
        <span class="material-symbols-outlined" aria-hidden="true" style="font-size:18px;">close</span>
      </button>
    </div>
  }

  <app-bottom-nav [tabs]="tabs()" [activeId]="activeTab()" />
</div>
```

- [ ] **Step 5: Update `app.css` for the install tip and safe-area handling**

Replace `src/app/app.css` with:
```css
:host { display: block; height: 100%; height: 100dvh; }

.ios-tip {
  position: absolute;
  left: 12px; right: 12px;
  bottom: calc(env(safe-area-inset-bottom) + 76px);
  z-index: 40;
  background: var(--ink); color: white;
  border-radius: var(--radius-card);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  padding: 14px 14px 14px 16px;
  display: flex; align-items: flex-start; gap: 12px;
}
.ios-tip-body { flex: 1; font-size: 12.5px; line-height: 1.45; }
.ios-tip-close {
  width: 28px; height: 28px; border-radius: 50%;
  background: transparent; color: rgba(255,255,255,0.7);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.ios-tip-close:active { color: white; }
```

- [ ] **Step 6: Add JSON module resolution if missing**

Check `tsconfig.json` for `"resolveJsonModule": true`. If not present, add it under `compilerOptions`. Then run:
```bash
npm run build
```
Expected: build succeeds (existing feature components may still type-error against the new POI shape — those are fixed in Tasks 14–17).

- [ ] **Step 7: Update existing app.spec.ts**

Replace `src/app/app.spec.ts` with:
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the app shell with bottom nav', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    const nav = fixture.nativeElement.querySelector('app-bottom-nav');
    expect(nav).toBeTruthy();
  });
});
```

- [ ] **Step 8: Run the app shell test**

Run: `npm test -- --run src/app/app.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/app.ts src/app/app.html src/app/app.css src/app/app.routes.ts src/app/app.spec.ts \
        src/app/features/home/ src/app/features/saved/ src/app/features/trips/ \
        tsconfig.json
git commit -m "feat(nav): five-tab bottom nav, Home as default landing"
```

---

## Task 13: Home tab — magazine feed

**Files:**
- Modify: `src/app/features/home/home.component.ts`
- Modify: `src/app/features/home/home.component.html`
- Create: `src/app/features/home/home.component.css`

- [ ] **Step 1: Implement the Home component**

Replace `src/app/features/home/home.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroCardComponent } from '../../ui/hero-card/hero-card.component';
import { CardComponent } from '../../ui/card/card.component';
import { ChipComponent } from '../../ui/chip/chip.component';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { TwoRiversMarkComponent } from '../../ui/two-rivers-mark/two-rivers-mark.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { HoursService } from '../../core/hours/hours.service';
import { ITINERARIES } from '../../data/itineraries';
import { CATEGORY_ICONS } from '../../data/pois';
import { formatDistance } from '../../data/distance';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroCardComponent, CardComponent, ChipComponent, I18nTextPipe, TwoRiversMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly geo = inject(GeolocationService);
  private proximity = inject(ProximityService);
  private hours = inject(HoursService);

  readonly icons = CATEGORY_ICONS;
  protected fmtDistance = formatDistance;

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  /** Pick today's itinerary by current hour: morning → history-walk; midday → family-day;
   *  afternoon → viewpoint-sunset; evening → foodie-crawl; rainy fallback → rainy-day. */
  protected readonly todaysPick = computed(() => {
    const hour = new Date().getHours();
    const id =
      hour < 11 ? 'history-walk' :
      hour < 14 ? 'family-day' :
      hour < 17 ? 'viewpoint-sunset' :
      'foodie-crawl';
    return ITINERARIES.find(i => i.id === id) ?? ITINERARIES[0];
  });

  protected readonly nearestOpen = computed(() => {
    const ranked = this.proximity.ranked();
    const now = new Date();
    return ranked
      .map(r => {
        const state = r.poi.hours ? this.hours.isOpenAt(r.poi.hours.raw, now).state : 'unknown';
        return { ...r, openState: state as 'open' | 'closed' | 'unknown' };
      })
      .filter(r => r.openState !== 'closed') // keep open + unknown
      .slice(0, 5);
  });

  formatHourMeta(durationMinutes: number): string {
    if (durationMinutes < 60) return `${durationMinutes} min`;
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
}
```

- [ ] **Step 2: Implement the template**

Replace `src/app/features/home/home.component.html` with:
```html
<div class="home">
  <header class="home-head">
    <div>
      <span class="home-eyebrow"><app-two-rivers-mark [size]="14" /> {{ t().home.greeting }}</span>
      <h1 class="home-title">Beograd</h1>
    </div>
    <a routerLink="/settings" class="home-settings" aria-label="Settings">
      <span class="material-symbols-outlined" aria-hidden="true">settings</span>
    </a>
  </header>

  <section class="home-section">
    <div class="home-section-h">
      <span class="home-eyebrow">{{ t().home.todays_pick }}</span>
    </div>
    <a [routerLink]="['/itinerary', todaysPick().id]" class="block">
      <app-hero-card
        [eyebrow]="formatHourMeta(todaysPick().durationMinutes)"
        [title]="todaysPick().title | i18nText"
        [meta]="todaysPick().subtitle | i18nText" />
    </a>
  </section>

  @if (nearestOpen().length) {
    <section class="home-section">
      <div class="home-section-h">
        <span class="home-section-l">{{ t().home.open_now }}</span>
        <a routerLink="/map" class="home-section-r">{{ t().home.see_all }} →</a>
      </div>
      <div class="home-row">
        @for (item of nearestOpen(); track item.poi.id) {
          <a [routerLink]="['/poi', item.poi.id]" class="home-tile">
            <app-card>
              <div class="home-tile-thumb">
                <span class="material-symbols-outlined" aria-hidden="true">{{ icons[item.poi.category] }}</span>
              </div>
              <div class="home-tile-body">
                <span class="home-tile-name">{{ item.poi.name | i18nText }}</span>
                <span class="home-tile-meta">{{ fmtDistance(item.meters) }}</span>
                @if (item.openState === 'open') {
                  <app-chip variant="open-now">{{ t().poi.open_now }}</app-chip>
                }
              </div>
            </app-card>
          </a>
        }
      </div>
    </section>
  }

  <section class="home-section">
    <div class="home-section-h">
      <span class="home-section-l">{{ t().home.day_trips }}</span>
    </div>
    <app-card variant="concrete">
      <div class="home-trips-soon">
        <span class="material-symbols-outlined" aria-hidden="true" style="font-size: 28px;">directions_train</span>
        <p>{{ t().home.day_trips_coming_soon }}</p>
      </div>
    </app-card>
  </section>
</div>
```

- [ ] **Step 3: Implement the styles**

Create `src/app/features/home/home.component.css`:
```css
:host { display: block; }
.home { padding: env(safe-area-inset-top) 0 96px; min-height: 100%; }
.home-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 18px 12px; }
.home-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: var(--accent); display: inline-flex; align-items: center; gap: 6px; }
.home-title { font-size: 32px; line-height: 1.05; margin: 4px 0 0; color: var(--ink); }
.home-settings {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.7); color: var(--ink-2);
  text-decoration: none;
}
.home-section { padding: 18px; }
.home-section-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.home-section-l { font-size: 14px; font-weight: 700; color: var(--ink); }
.home-section-r { font-size: 12px; font-weight: 600; color: var(--accent); text-decoration: none; }
.home-row { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 4px; margin: 0 -4px; padding-inline: 4px; }
.home-row::-webkit-scrollbar { display: none; }
.home-tile { min-width: 160px; max-width: 160px; scroll-snap-align: start; text-decoration: none; color: inherit; }
.home-tile-thumb {
  aspect-ratio: 1 / 1;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent-soft), var(--fortress));
  color: var(--accent);
  font-size: 36px;
}
.home-tile-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; }
.home-tile-name { font-size: 13px; font-weight: 600; color: var(--ink); line-height: 1.2; }
.home-tile-meta { font-size: 11px; color: var(--ink-3); }
.home-trips-soon { padding: 18px 16px; display: flex; align-items: center; gap: 14px; color: white; }
.home-trips-soon p { margin: 0; font-size: 13px; line-height: 1.5; opacity: 0.9; }
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build may still fail because `features/poi-detail`, `features/poi-list`, `features/itinerary-list`, `features/itinerary-detail`, `features/map`, `features/settings` still reference legacy fields. Continue — those are fixed in Tasks 14–17, 20.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/home/
git commit -m "feat(home): magazine-feed Home tab with Today's pick + Open now"
```

---

## Task 14: POI detail redesign — provenance chips, hours heatmap, save

**Files:**
- Modify: `src/app/features/poi-detail/poi-detail.component.ts`
- Modify: `src/app/features/poi-detail/poi-detail.component.html`
- Create: `src/app/features/poi-detail/poi-detail.component.css`

- [ ] **Step 1: Replace the POI detail component**

Replace `src/app/features/poi-detail/poi-detail.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getPoi, CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { HoursService } from '../../core/hours/hours.service';
import { SavedService } from '../../core/saved/saved.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { ChipComponent } from '../../ui/chip/chip.component';
import { HoursHeatmapComponent } from '../../ui/charts/hours-heatmap.component';
import { formatDistance, walkingMinutes } from '../../data/distance';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-poi-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, ChipComponent, HoursHeatmapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poi-detail.component.html',
  styleUrl: './poi-detail.component.css',
})
export class PoiDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  private hours = inject(HoursService);
  private i18n = inject(I18nService);
  protected readonly geo = inject(GeolocationService);
  protected readonly saved = inject(SavedService);

  protected readonly labels = CATEGORY_LABELS;
  protected readonly icons = CATEGORY_ICONS;

  private idSig = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly poi = computed(() => {
    const id = this.idSig().get('id');
    return id ? getPoi(id) : undefined;
  });

  protected readonly distance = computed(() => {
    const p = this.poi();
    if (!p) return null;
    return this.proximity.distanceTo(p);
  });

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly openState = computed(() => {
    const p = this.poi();
    if (!p?.hours) return null;
    return this.hours.isOpenAt(p.hours.raw, new Date()).state;
  });

  protected readonly weeklyGrid = computed(() => {
    const p = this.poi();
    if (!p?.hours) return null;
    return this.hours.weeklyGrid(p.hours.raw);
  });

  /** EDITOR'S PICK chip rule: high editorial confidence AND fewer than two automated checks pass. */
  protected readonly showEditorPick = computed(() => {
    const p = this.poi();
    if (!p) return false;
    if (p.editorialConfidence !== 'high') return false;
    const passes = Object.values(p.reliability.checks).filter(Boolean).length;
    return passes < 2;
  });

  protected readonly googleSource = computed(() =>
    this.poi()?.sources.find(s => s.kind === 'google-places') as { reviewCount: number; rating: number } | undefined
  );

  protected fmtDistance = formatDistance;
  protected fmtWalk(meters: number): string {
    return `${walkingMinutes(meters)} min walk`;
  }

  formatVerified(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  toggleSave(): void {
    const p = this.poi();
    if (!p) return;
    if (this.saved.isSaved(p.id)) {
      void this.saved.remove(p.id);
    } else {
      void this.saved.add(p.id);
    }
  }
}
```

- [ ] **Step 2: Replace the template**

Replace `src/app/features/poi-detail/poi-detail.component.html` with:
```html
<div class="poi-page">
  @if (!poi()) {
    <div class="poi-empty">
      <h1>{{ t().poi.not_found }}</h1>
      <a routerLink="/map" class="poi-empty-link">← {{ t().poi.back }}</a>
    </div>
  } @else {
    <header class="poi-hero">
      <a routerLink="/map" class="poi-back" [attr.aria-label]="t().poi.back">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </a>
      <button type="button" class="poi-save" (click)="toggleSave()"
              [attr.aria-label]="saved.isSaved(poi()!.id) ? t().poi.saved : t().poi.save">
        <span class="material-symbols-outlined" aria-hidden="true">
          {{ saved.isSaved(poi()!.id) ? 'bookmark' : 'bookmark_border' }}
        </span>
      </button>
      <div class="poi-hero-fg">
        <app-chip variant="filter-active">{{ labels[poi()!.category] }}</app-chip>
        <h1 class="poi-name">{{ poi()!.name | i18nText }}</h1>
      </div>
    </header>

    <div class="poi-body">
      <!-- Provenance chips -->
      <div class="poi-chips">
        @if (poi()!.reliability.checks.wikipedia) { <app-chip variant="verified">{{ t().poi.wikipedia }} ✓</app-chip> }
        @if (poi()!.reliability.checks.osm) { <app-chip variant="verified">{{ t().poi.osm }} ✓</app-chip> }
        @if (poi()!.reliability.checks.official) { <app-chip variant="verified">{{ t().poi.official }} ✓</app-chip> }
        @if (poi()!.reliability.checks.crowdsourced && googleSource()) {
          <app-chip variant="reviews">{{ googleSource()!.reviewCount.toLocaleString() }} reviews</app-chip>
        }
        @if (showEditorPick()) { <app-chip variant="editor-pick">{{ t().poi.editor_pick }}</app-chip> }
        @if (openState() === 'open') { <app-chip variant="open-now">{{ t().poi.open_now }}</app-chip> }
        @if (openState() === 'closed') { <app-chip variant="closed">{{ t().poi.closed }}</app-chip> }
      </div>

      <!-- Distance / map link -->
      @if (distance() !== null) {
        <div class="poi-distance">
          <span class="material-symbols-outlined" aria-hidden="true">near_me</span>
          <div class="poi-distance-body">
            <strong>{{ fmtDistance(distance()!) }}</strong>
            <span>{{ fmtWalk(distance()!) }}</span>
          </div>
          <a [routerLink]="['/map']" [queryParams]="{ focus: poi()!.id }" class="poi-distance-link">Map →</a>
        </div>
      } @else if (geo.permission() !== 'denied') {
        <button type="button" class="poi-gps-cta" (click)="geo.start()">
          <span class="material-symbols-outlined" aria-hidden="true" style="font-size:16px;">my_location</span>
          Show distance from me
        </button>
      }

      <p class="poi-desc">{{ poi()!.description | i18nText }}</p>

      <!-- Hours heatmap -->
      @if (weeklyGrid()) {
        <div class="poi-section">
          <h3 class="poi-section-h">{{ t().poi.hours }}</h3>
          <app-hours-heatmap [grid]="weeklyGrid()!" />
          @if (poi()!.hours?.notes; as notes) {
            <p class="poi-hours-notes">{{ notes | i18nText }}</p>
          }
        </div>
      }

      <!-- Address / price -->
      <dl class="poi-meta-grid">
        <div>
          <dt>{{ t().poi.address }}</dt>
          <dd>{{ poi()!.address | i18nText }}</dd>
        </div>
        @if (poi()!.pricing) {
          <div>
            <dt>{{ t().poi.price }}</dt>
            <dd>{{ poi()!.pricing!.tier }}</dd>
          </div>
        }
      </dl>

      <!-- Tags -->
      @if (poi()!.tags.length) {
        <div class="poi-tags">
          @for (tag of poi()!.tags; track tag) {
            <span class="poi-tag">#{{ tag }}</span>
          }
        </div>
      }

      <!-- Verified date -->
      <p class="poi-verified">{{ t().poi.verified_on.replace('{date}', formatVerified(poi()!.verifiedAt)) }}</p>
    </div>
  }
</div>
```

- [ ] **Step 3: Implement the styles**

Create `src/app/features/poi-detail/poi-detail.component.css`:
```css
:host { display: block; }
.poi-page { padding-bottom: 96px; min-height: 100%; }
.poi-empty { padding: 48px 18px; text-align: center; }
.poi-empty-link { color: var(--accent); text-decoration: none; font-weight: 600; }

.poi-hero {
  position: relative;
  height: 220px;
  background: linear-gradient(135deg, var(--accent-soft), var(--fortress) 60%, var(--river-deep));
  color: white;
  display: flex; align-items: flex-end; padding: 18px;
}
.poi-back, .poi-save {
  position: absolute; top: max(env(safe-area-inset-top), 14px);
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.92); color: var(--ink);
  border: none; cursor: pointer; text-decoration: none;
}
.poi-back { left: 14px; }
.poi-save { right: 14px; color: var(--accent); }
.poi-hero-fg { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.poi-name { font-size: 28px; line-height: 1.05; margin: 0; }

.poi-body { padding: 18px; display: flex; flex-direction: column; gap: 18px; }
.poi-chips { display: flex; flex-wrap: wrap; gap: 6px; }

.poi-distance {
  display: flex; align-items: center; gap: 12px;
  background: rgba(0,0,0,0.04); padding: 12px 14px; border-radius: var(--radius-card);
}
.poi-distance .material-symbols-outlined { color: var(--accent); }
.poi-distance-body { flex: 1; display: flex; flex-direction: column; }
.poi-distance-body strong { font-size: 14px; }
.poi-distance-body span { font-size: 11px; color: var(--ink-3); }
.poi-distance-link { color: var(--accent); font-size: 12px; font-weight: 600; text-decoration: none; }
.poi-gps-cta {
  display: inline-flex; align-items: center; gap: 8px; align-self: flex-start;
  padding: 10px 14px; border-radius: var(--radius-pill);
  background: var(--ink); color: white; border: none; cursor: pointer; font-size: 12px; font-weight: 600;
}

.poi-desc { font-size: 15px; line-height: 1.55; color: var(--ink); margin: 0; }

.poi-section { display: flex; flex-direction: column; gap: 8px; }
.poi-section-h { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); margin: 0; font-weight: 600; }
.poi-hours-notes { font-size: 12px; color: var(--ink-2); margin: 4px 0 0; }

.poi-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 0; }
.poi-meta-grid dt { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 2px; }
.poi-meta-grid dd { margin: 0; font-size: 14px; color: var(--ink); }

.poi-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.poi-tag { font-size: 11px; padding: 4px 9px; border-radius: var(--radius-pill); background: rgba(0,0,0,0.05); color: var(--ink-2); }

.poi-verified { font-size: 11px; color: var(--ink-3); text-align: center; margin-top: 8px; }
```

- [ ] **Step 4: Type-check and lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
npm run lint
```
Expected: poi-detail compiles cleanly. Other features may still fail.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/poi-detail/
git commit -m "feat(poi-detail): redesign with provenance chips + hours heatmap + save"
```

---

## Task 15: Itinerary detail redesign — timeline chart, distance progress, complete state

**Files:**
- Modify: `src/app/features/itinerary-detail/itinerary-detail.component.ts`
- Modify: `src/app/features/itinerary-detail/itinerary-detail.component.html`
- Create: `src/app/features/itinerary-detail/itinerary-detail.component.css`

- [ ] **Step 1: Replace the itinerary detail component**

Replace `src/app/features/itinerary-detail/itinerary-detail.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getItinerary } from '../../data/itineraries';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { ItineraryProgressService } from '../../core/itinerary-progress/itinerary-progress.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { ItineraryTimelineComponent, TimelineNode } from '../../ui/charts/itinerary-timeline.component';
import { DistanceProgressComponent } from '../../ui/charts/distance-progress.component';
import { ChipComponent } from '../../ui/chip/chip.component';
import { formatDistance, haversineMeters } from '../../data/distance';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, ItineraryTimelineComponent, DistanceProgressComponent, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-detail.component.html',
  styleUrl: './itinerary-detail.component.css',
})
export class ItineraryDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  private i18n = inject(I18nService);
  protected readonly geo = inject(GeolocationService);
  protected readonly progress = inject(ItineraryProgressService);
  protected readonly icons = CATEGORY_ICONS;
  protected fmtDistance = formatDistance;

  private idSig = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly itinerary = computed(() => {
    const id = this.idSig().get('id');
    return id ? getItinerary(id) : undefined;
  });

  protected readonly enrichedStops = computed(() => {
    const it = this.itinerary();
    if (!it) return [];
    return it.stops.map((s) => {
      const poi = getPoi(s.poiId);
      const distance = poi ? this.proximity.distanceTo(poi) : null;
      const reachedIds = it ? this.progress.progressFor(it.id)?.reachedStopIds ?? [] : [];
      const reached = reachedIds.includes(s.poiId) || (distance !== null && distance <= 100);
      return { stop: s, poi, distance, reached };
    });
  });

  /** Index of the next not-yet-reached stop. Returns enrichedStops.length when complete. */
  protected readonly nextStopIndex = computed(() => {
    const stops = this.enrichedStops();
    const idx = stops.findIndex(s => !s.reached);
    return idx === -1 ? stops.length : idx;
  });

  protected readonly isComplete = computed(() => {
    const stops = this.enrichedStops();
    return stops.length > 0 && this.nextStopIndex() === stops.length;
  });

  protected readonly timelineNodes = computed<TimelineNode[]>(() => {
    const stops = this.enrichedStops();
    const nextIdx = this.nextStopIndex();
    return stops.map((s, i) => ({
      label: s.poi ? this.pickName(s.poi.name) : s.stop.poiId,
      arrivalOffsetMinutes: s.stop.arrivalOffsetMinutes,
      reached: s.reached,
      isNext: i === nextIdx,
    }));
  });

  /** Total walking distance in meters between successive stops with known POIs. */
  protected readonly totalMeters = computed(() => {
    const stops = this.enrichedStops();
    let total = 0;
    for (let i = 0; i + 1 < stops.length; i++) {
      const a = stops[i].poi, b = stops[i + 1].poi;
      if (a && b) total += haversineMeters(a, b);
    }
    return Math.max(total, 1);
  });

  protected readonly walkedMeters = computed(() => {
    const stops = this.enrichedStops();
    let walked = 0;
    for (let i = 0; i + 1 < stops.length; i++) {
      if (!stops[i].reached) break;
      const a = stops[i].poi, b = stops[i + 1].poi;
      if (a && b) walked += haversineMeters(a, b);
    }
    return walked;
  });

  hours(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  offset(min: number): string {
    if (min === 0) return 'Start';
    if (min < 60) return `+${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `+${h} h` : `+${h} h ${m} min`;
  }

  startItinerary(): void {
    const it = this.itinerary();
    if (it) void this.progress.start(it.id);
  }

  resetItinerary(): void {
    const it = this.itinerary();
    if (it) void this.progress.clear(it.id);
  }

  private pickName(b: { en: string; sr_lat: string; sr_cyr: string }): string {
    const loc = this.i18n.locale();
    if (loc.locale === 'sr' && b.sr_lat) return b.sr_lat;
    return b.en;
  }
}
```

- [ ] **Step 2: Replace the template**

Replace `src/app/features/itinerary-detail/itinerary-detail.component.html` with:
```html
<div class="it">
  @if (!itinerary()) {
    <div class="it-empty">
      <h1>Not found</h1>
      <a routerLink="/routes" class="it-empty-link">← Back to routes</a>
    </div>
  } @else {
    <header class="it-hero">
      <a routerLink="/routes" class="it-back" [attr.aria-label]="t().itinerary.back">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </a>
      <div class="it-hero-fg">
        <span class="it-eyebrow">{{ t().itinerary.stops.replace('{n}', enrichedStops().length.toString()) }} · {{ hours(itinerary()!.durationMinutes) }}</span>
        <h1 class="it-title">{{ itinerary()!.title | i18nText }}</h1>
        <p class="it-sub">{{ itinerary()!.subtitle | i18nText }}</p>
        <div class="it-actions">
          <a [routerLink]="['/map']" [queryParams]="{ itinerary: itinerary()!.id }" class="it-btn it-btn-primary">
            <span class="material-symbols-outlined" aria-hidden="true" style="font-size:16px;">map</span>
            {{ t().itinerary.show_on_map }}
          </a>
          @if (progress.activeId() !== itinerary()!.id && !isComplete()) {
            <button type="button" class="it-btn it-btn-secondary" (click)="startItinerary()">Start</button>
          }
          @if (progress.activeId() === itinerary()!.id) {
            <button type="button" class="it-btn it-btn-secondary" (click)="resetItinerary()">Reset</button>
          }
        </div>
      </div>
    </header>

    @if (isComplete()) {
      <div class="it-complete">
        <span class="material-symbols-outlined" aria-hidden="true" style="font-size:18px;">check_circle</span>
        {{ t().itinerary.complete }}
      </div>
    }

    <section class="it-section">
      <app-itinerary-timeline [nodes]="timelineNodes()" />
    </section>

    @if (progress.activeId() === itinerary()!.id) {
      <section class="it-section it-progress">
        <app-distance-progress [walkedMeters]="walkedMeters()" [totalMeters]="totalMeters()" />
      </section>
    }

    @if (!itinerary()!.geometryUrl) {
      <p class="it-no-geom">{{ t().itinerary.route_unavailable }}</p>
    }

    <ol class="it-stops">
      @for (s of enrichedStops(); track s.stop.poiId; let i = $index) {
        <li>
          <a [routerLink]="s.poi ? ['/poi', s.poi.id] : null"
             class="it-stop"
             [class.is-next]="i === nextStopIndex() && !isComplete()"
             [class.is-reached]="s.reached">
            <div class="it-stop-rail">
              <div class="it-stop-num">{{ i + 1 }}</div>
              @if (i < enrichedStops().length - 1) { <div class="it-stop-line"></div> }
            </div>
            <div class="it-stop-body">
              <div class="it-stop-meta">
                <span>{{ offset(s.stop.arrivalOffsetMinutes) }}</span>
                @if (s.distance !== null) {
                  <span class="it-stop-dist">· {{ fmtDistance(s.distance) }}</span>
                }
              </div>
              <div class="it-stop-name">{{ s.poi ? (s.poi.name | i18nText) : s.stop.poiId }}</div>
              @if (s.stop.notes) {
                <div class="it-stop-notes">{{ s.stop.notes | i18nText }}</div>
              }
            </div>
          </a>
        </li>
      }
    </ol>
  }
</div>
```

- [ ] **Step 3: Implement the styles**

Create `src/app/features/itinerary-detail/itinerary-detail.component.css`:
```css
:host { display: block; }
.it { padding-bottom: 96px; min-height: 100%; }
.it-empty { padding: 48px 18px; text-align: center; }
.it-empty-link { color: var(--accent); text-decoration: none; font-weight: 600; }

.it-hero {
  background: var(--ink);
  color: white;
  padding: max(env(safe-area-inset-top), 56px) 20px 28px;
  border-radius: 0 0 28px 28px;
  position: relative;
}
.it-back {
  position: absolute;
  top: max(env(safe-area-inset-top), 14px);
  left: 14px;
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.12);
  display: flex; align-items: center; justify-content: center;
  color: white;
  text-decoration: none;
}
.it-hero-fg { display: flex; flex-direction: column; gap: 6px; }
.it-eyebrow { color: var(--accent); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; }
.it-title { font-size: 28px; line-height: 1.05; margin: 0; }
.it-sub { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 6px; }
.it-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.it-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 14px; border-radius: var(--radius-pill);
  font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
  border: none; cursor: pointer; text-decoration: none;
}
.it-btn-primary { background: var(--accent); color: white; }
.it-btn-secondary { background: rgba(255,255,255,0.12); color: white; }

.it-complete {
  margin: 14px 18px 0; padding: 10px 14px;
  background: var(--good-soft); color: var(--good);
  border-radius: var(--radius-card); display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 700;
}

.it-section { padding: 20px 18px 6px; }
.it-progress { padding-top: 6px; }

.it-no-geom { font-size: 12px; color: var(--ink-2); padding: 0 18px; margin: 4px 0 0; }

.it-stops { list-style: none; padding: 12px 18px 0; margin: 0; display: flex; flex-direction: column; gap: 0; }
.it-stop {
  display: flex; gap: 14px; padding: 12px 8px;
  text-decoration: none; color: inherit;
  border-radius: 12px;
}
.it-stop.is-next { background: var(--accent-soft); }
.it-stop:active { background: rgba(0,0,0,0.04); }
.it-stop-rail { display: flex; flex-direction: column; align-items: center; padding-top: 4px; }
.it-stop-num {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(0,0,0,0.08); color: var(--ink-2);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.it-stop.is-next .it-stop-num { background: var(--accent); color: white; }
.it-stop.is-reached:not(.is-next) .it-stop-num { background: var(--ink-3); color: white; }
.it-stop-line { width: 2px; flex: 1; background: rgba(0,0,0,0.08); margin: 4px 0; min-height: 20px; }
.it-stop-body { flex: 1; display: flex; flex-direction: column; gap: 2px; padding-top: 4px; }
.it-stop-meta { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); display: flex; gap: 4px; }
.it-stop-dist { color: var(--accent); }
.it-stop-name { font-size: 14px; font-weight: 600; color: var(--ink); }
.it-stop-notes { font-size: 12px; color: var(--ink-2); }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: this file compiles. Map / itinerary-list / poi-list / settings still pending.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/itinerary-detail/
git commit -m "feat(itinerary-detail): timeline + distance progress + complete state"
```

---

## Task 16: Map polish — bug fixes folded in, ngClass migration, recenter+watch

**Files:**
- Modify: `src/app/core/geolocation.service.ts`
- Modify: `src/app/features/map/map.component.ts`
- Modify: `src/app/features/map/map.component.html`
- Modify: `src/app/features/map/map.component.css`

- [ ] **Step 1: Fix geolocation requestOnce so it clears stale errors**

In `src/app/core/geolocation.service.ts`, replace the `requestOnce` method body with:
```ts
  /** One-shot fix; useful for centring the map without starting a watch. */
  requestOnce(): Promise<UserPosition> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p: UserPosition = {
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          };
          this.position.set(p);
          this.permission.set('granted');
          this.error.set(null);
          resolve(p);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) this.permission.set('denied');
          this.error.set(err.message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15_000 },
      );
    });
  }
```

- [ ] **Step 2: Replace map.component.ts — bug fixes folded in**

Replace `src/app/features/map/map.component.ts` with:
```ts
import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy,
  ViewChild, computed, effect, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GeolocationService } from '../../core/geolocation.service';
import { ProximityService } from '../../core/proximity.service';
import { TilePackService } from '../../core/tile-pack.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { POIS, CATEGORY_LABELS, getPoi } from '../../data/pois';
import { ITINERARIES, getItinerary } from '../../data/itineraries';
import { formatDistance } from '../../data/distance';
import { ChipComponent } from '../../ui/chip/chip.component';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

const BELGRADE_CENTER: [number, number] = [20.4612, 44.8125];

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, RouterLink, ChipComponent, I18nTextPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  readonly tilePack = inject(TilePackService);
  readonly geo = inject(GeolocationService);
  readonly proximity = inject(ProximityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);

  readonly itineraries = ITINERARIES;
  readonly activeItineraryId = signal<string | null>(null);
  readonly mapReady = signal(false);
  readonly mapError = signal<string | null>(null);
  readonly downloadProgressPct = computed(() =>
    Math.round(this.tilePack.progress() * 100),
  );
  readonly nearestThree = computed(() => this.proximity.ranked().slice(0, 3));

  readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });
  private readonly intendedItinerary = computed(() => this.queryParams().get('itinerary'));
  private readonly focusedPoiId = computed(() => this.queryParams().get('focus'));

  private map: import('maplibre-gl').Map | null = null;
  private userMarker: import('maplibre-gl').Marker | null = null;
  private accuracyCircleId = 'user-accuracy';
  private lastFocusedPoiId: string | null = null;

  constructor() {
    effect(() => {
      if (this.tilePack.status() === 'ready' && !this.map && this.mapHost) {
        void this.bootMap();
      }
    });
    effect(() => {
      const pos = this.geo.position();
      if (!this.map || !pos) return;
      void this.ensureUserMarker(pos.lng, pos.lat, pos.accuracy);
    });
    effect(() => {
      const id = this.activeItineraryId();
      if (!this.map) return;
      void this.renderItinerary(id);
    });
    effect(() => {
      const id = this.intendedItinerary();
      if (id && id !== this.activeItineraryId()) this.activeItineraryId.set(id);
    });
    effect(() => {
      const id = this.focusedPoiId();
      if (!id || !this.mapReady() || !this.map) return;
      if (id === this.lastFocusedPoiId) return;
      const poi = getPoi(id);
      if (!poi) return;
      this.lastFocusedPoiId = id;
      this.map.flyTo({ center: [poi.lng, poi.lat], zoom: 16, speed: 1.4 });
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.tilePack.init();
    if (this.tilePack.status() === 'ready') {
      await this.bootMap();
    }
  }

  ngOnDestroy(): void {
    this.geo.stop();
    this.map?.remove();
    this.map = null;
  }

  async startDownload(): Promise<void> {
    try { await this.tilePack.download(); } catch { /* tilePack.error surfaced in template */ }
  }

  toggleGps(): void {
    if (this.geo.isWatching()) {
      this.geo.stop();
      return;
    }
    this.geo.start();
  }

  /**
   * Recenter on user. If no watch is active, start one — otherwise the marker
   * freezes after a single fix, which is what the legacy behaviour did.
   */
  async recenterOnUser(): Promise<void> {
    try {
      const pos = this.geo.position() ?? (await this.geo.requestOnce());
      if (!this.geo.isWatching()) this.geo.start();
      this.map?.flyTo({ center: [pos.lng, pos.lat], zoom: 16, speed: 1.4 });
    } catch {
      // Permission denied — geo.error surfaces in the template.
    }
  }

  setActiveItinerary(id: string | null): void {
    this.activeItineraryId.set(id);
  }

  formatDistance = formatDistance;
  categoryLabel(category: keyof typeof CATEGORY_LABELS): string {
    return CATEGORY_LABELS[category];
  }

  private async bootMap(): Promise<void> {
    if (this.map) return;
    try {
      const blob = await this.tilePack.ensurePack();
      const [{ default: maplibregl }, pmtilesLib, styleResp] = await Promise.all([
        import('maplibre-gl'),
        import('pmtiles'),
        fetch('assets/styles/map-style.json'),
      ]);
      const style = await styleResp.json();

      const protocol = new pmtilesLib.Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);

      const blobSource = {
        getKey: () => 'belgrade',
        getBytes: async (offset: number, length: number) => {
          const slice = blob.slice(offset, offset + length);
          return { data: await slice.arrayBuffer() };
        },
      };
      const pm = new pmtilesLib.PMTiles(blobSource as unknown as ConstructorParameters<typeof pmtilesLib.PMTiles>[0]);
      protocol.add(pm);

      this.map = new maplibregl.Map({
        container: this.mapHost.nativeElement,
        style,
        center: BELGRADE_CENTER,
        zoom: 13,
        attributionControl: { compact: true },
      });
      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      this.map.on('load', () => {
        this.addPoiLayer();
        const pos = this.geo.position();
        if (pos) void this.ensureUserMarker(pos.lng, pos.lat, pos.accuracy);
        const id = this.activeItineraryId();
        if (id) void this.renderItinerary(id);
        this.mapReady.set(true);
      });

      this.map.on('error', (e) => {
        // eslint-disable-next-line no-console
        console.warn('MapLibre error', e?.error);
      });
    } catch (e) {
      this.mapError.set(e instanceof Error ? e.message : String(e));
    }
  }

  private addPoiLayer(): void {
    if (!this.map) return;
    const features = POIS.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name.en, category: p.category },
    }));
    this.map.addSource('pois', { type: 'geojson', data: { type: 'FeatureCollection', features } });
    this.map.addLayer({
      id: 'poi-circles',
      type: 'circle',
      source: 'pois',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 11],
        'circle-color': '#B8540C',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2,
      },
    });
    this.map.addLayer({
      id: 'poi-labels',
      type: 'symbol',
      source: 'pois',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': '#2A2018',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.5,
      },
    });
    this.map.on('click', 'poi-circles', (e) => {
      const id = e.features?.[0]?.properties?.['id'] as string | undefined;
      if (id) void this.router.navigate(['/poi', id]);
    });
    this.map.on('mouseenter', 'poi-circles', () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'poi-circles', () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  private async ensureUserMarker(lng: number, lat: number, accuracy: number): Promise<void> {
    const { Marker } = await import('maplibre-gl');
    if (!this.map) return;
    if (!this.userMarker) {
      const el = document.createElement('div');
      el.className = 'user-dot';
      this.userMarker = new Marker({ element: el }).setLngLat([lng, lat]).addTo(this.map);
    } else {
      this.userMarker.setLngLat([lng, lat]);
    }
    const accuracyDegrees = accuracy / 111_320;
    const data = this.makeCircle(lng, lat, accuracyDegrees);
    const src = this.map.getSource(this.accuracyCircleId) as
      | import('maplibre-gl').GeoJSONSource
      | undefined;
    if (src) {
      src.setData(data);
    } else {
      this.map.addSource(this.accuracyCircleId, { type: 'geojson', data });
      this.map.addLayer({
        id: this.accuracyCircleId,
        type: 'fill',
        source: this.accuracyCircleId,
        paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.15 },
      }, 'poi-circles');
    }
  }

  private makeCircle(lng: number, lat: number, radiusDegrees: number): GeoJSON.Feature {
    const points = 64;
    const coords: [number, number][] = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      coords.push([lng + radiusDegrees * Math.cos(angle), lat + radiusDegrees * Math.sin(angle)]);
    }
    coords.push(coords[0]);
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
  }

  private async renderItinerary(id: string | null): Promise<void> {
    if (!this.map) return;
    const sourceId = 'active-itinerary';
    const layerId = 'active-itinerary-line';
    if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
    if (!id) return;
    const itinerary = getItinerary(id);
    if (!itinerary) return;
    try {
      const resp = await fetch(itinerary.geometryUrl);
      if (!resp.ok) return;
      const geojson = await resp.json();
      this.map.addSource(sourceId, { type: 'geojson', data: geojson });
      this.map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#B8540C',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 5],
          'line-dasharray': [0, 2, 4],
        },
      }, 'poi-circles');
      const coords = (geojson.features?.[0]?.geometry?.coordinates ?? []) as [number, number][];
      if (coords.length) {
        const { LngLatBounds } = await import('maplibre-gl');
        const bounds = coords.reduce((b, c) => b.extend(c), new LngLatBounds(coords[0], coords[0]));
        this.map.fitBounds(bounds, { padding: 60, duration: 600 });
      }
    } catch {
      // Silently ignore; route is optional.
    }
  }
}
```

- [ ] **Step 3: Replace map.component.html — ngClass everywhere there was a `/`-class**

Replace `src/app/features/map/map.component.html` with:
```html
<div class="map-wrap">
  <div #mapHost class="map-host"></div>

  @if (tilePack.status() === 'missing') {
    <div class="map-overlay">
      <div class="map-card">
        <div class="map-icon"><span class="material-symbols-outlined" aria-hidden="true">cloud_download</span></div>
        <h2>Get ready for offline</h2>
        <p>Beograde needs to download the Belgrade map pack once. After this, the app works in airplane mode.</p>
        <button type="button" (click)="startDownload()" class="map-btn map-btn-primary">{{ t().map.download_pack }}</button>
        <p class="map-meta">One-time · Wi-Fi recommended</p>
      </div>
    </div>
  }

  @if (tilePack.status() === 'downloading') {
    <div class="map-overlay">
      <div class="map-card">
        <div class="map-icon map-icon-pulse"><span class="material-symbols-outlined" aria-hidden="true">download</span></div>
        <h2>{{ t().map.downloading }}</h2>
        <p>{{ downloadProgressPct() }}%</p>
        <div class="map-progress"><div class="map-progress-fill" [style.width.%]="downloadProgressPct()"></div></div>
      </div>
    </div>
  }

  @if (tilePack.status() === 'error') {
    <div class="map-overlay">
      <div class="map-card">
        <div class="map-icon map-icon-error"><span class="material-symbols-outlined" aria-hidden="true">error</span></div>
        <h2>{{ t().map.download_failed }}</h2>
        <p>{{ tilePack.error() }}</p>
        <button type="button" (click)="startDownload()" class="map-btn map-btn-primary">{{ t().map.try_again }}</button>
      </div>
    </div>
  }

  @if (tilePack.status() === 'ready') {
    <div class="map-controls-top">
      <div class="map-chip-row">
        <button type="button" (click)="setActiveItinerary(null)"
                class="map-chip"
                [class.is-active]="activeItineraryId() === null">
          {{ t().map.all_places }}
        </button>
        @for (it of itineraries; track it.id) {
          <button type="button" (click)="setActiveItinerary(it.id)"
                  class="map-chip"
                  [class.is-active]="activeItineraryId() === it.id">
            {{ it.title | i18nText }}
          </button>
        }
      </div>
    </div>

    <div class="map-controls-right">
      <button type="button" (click)="recenterOnUser()" [attr.aria-label]="t().map.recenter" class="map-fab">
        <span class="material-symbols-outlined" aria-hidden="true">my_location</span>
      </button>
      <button type="button" (click)="toggleGps()"
              [attr.aria-label]="geo.isWatching() ? t().map.tracking_on : t().map.tracking_off"
              class="map-fab"
              [class.is-watching]="geo.isWatching()">
        <span class="material-symbols-outlined" aria-hidden="true">{{ geo.isWatching() ? 'gps_fixed' : 'gps_off' }}</span>
      </button>
    </div>

    @if (geo.error()) {
      <div class="map-toast map-toast-error">{{ geo.error() }}</div>
    }

    @if (nearestThree().length) {
      <div class="map-near-row">
        @for (item of nearestThree(); track item.poi.id) {
          <a [routerLink]="['/poi', item.poi.id]" class="map-near-card">
            <span class="map-near-eyebrow">{{ categoryLabel(item.poi.category) }} · {{ formatDistance(item.meters) }}</span>
            <span class="map-near-name">{{ item.poi.name | i18nText }}</span>
            <span class="map-near-walk">{{ t().map.min_walk.replace('{n}', item.walkMinutes.toString()) }}</span>
          </a>
        }
      </div>
    }
  }
</div>
```

- [ ] **Step 4: Replace map.component.css**

Replace `src/app/features/map/map.component.css` with:
```css
:host { display: block; position: absolute; inset: 0; }
.map-wrap { position: relative; width: 100%; height: 100%; }
.map-host { position: absolute; inset: 0; background: var(--bg-warm-2); }

.map-overlay { position: absolute; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(245, 242, 237, 0.95); backdrop-filter: blur(4px); }
.map-card {
  background: var(--surface);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 28px 24px;
  max-width: 360px; width: 100%;
  text-align: center;
}
.map-card h2 { font-size: 22px; margin: 0 0 8px; }
.map-card p { font-size: 14px; color: var(--ink-2); margin: 0 0 20px; line-height: 1.5; }
.map-icon { width: 56px; height: 56px; border-radius: 18px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 30px; }
.map-icon-pulse { animation: pulse 1.6s infinite ease-in-out; }
.map-icon-error { background: rgba(184, 32, 12, 0.12); color: var(--bad); }
@keyframes pulse { 50% { opacity: 0.5; } }
.map-btn { width: 100%; padding: 12px; border-radius: var(--radius-card); border: none; cursor: pointer; font-weight: 600; font-size: 14px; }
.map-btn-primary { background: var(--accent); color: white; }
.map-meta { font-size: 11px; color: var(--ink-3); letter-spacing: 0.06em; text-transform: uppercase; margin-top: 14px !important; }

.map-progress { height: 8px; background: rgba(0,0,0,0.08); border-radius: 4px; overflow: hidden; margin-top: 6px; }
.map-progress-fill { height: 100%; background: var(--accent); transition: width 200ms; }

.map-controls-top { position: absolute; top: max(env(safe-area-inset-top), 14px); left: 14px; right: 64px; z-index: 20; }
.map-chip-row { display: flex; gap: 6px; overflow-x: auto; pointer-events: auto; padding-bottom: 4px; }
.map-chip-row::-webkit-scrollbar { display: none; }
.map-chip {
  flex-shrink: 0;
  padding: 7px 13px;
  background: rgba(255,255,255,0.92);
  color: var(--ink);
  border: none;
  border-radius: var(--radius-pill);
  font-size: 12px; font-weight: 600;
  white-space: nowrap; cursor: pointer;
}
.map-chip.is-active { background: var(--ink); color: white; }

.map-controls-right { position: absolute; bottom: 100px; right: 14px; z-index: 20; display: flex; flex-direction: column; gap: 8px; }
.map-fab {
  width: 48px; height: 48px;
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-card);
  display: flex; align-items: center; justify-content: center;
  border: none; cursor: pointer;
}
.map-fab.is-watching { background: var(--accent); color: white; }
.map-fab:active { transform: scale(0.95); }

.map-toast { position: absolute; bottom: 100px; left: 14px; right: 80px; z-index: 20; padding: 10px 14px; border-radius: var(--radius-pill); font-size: 12px; font-weight: 600; box-shadow: var(--shadow-card); }
.map-toast-error { background: var(--bad); color: white; }

.map-near-row { position: absolute; bottom: 14px; left: 14px; right: 14px; z-index: 20; display: flex; gap: 8px; overflow-x: auto; }
.map-near-row::-webkit-scrollbar { display: none; }
.map-near-card { flex-shrink: 0; min-width: 184px; max-width: 220px; background: var(--surface); border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: 12px; display: flex; flex-direction: column; gap: 4px; text-decoration: none; color: inherit; }
.map-near-eyebrow { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); }
.map-near-name { font-size: 13px; font-weight: 600; color: var(--ink); line-height: 1.2; }
.map-near-walk { font-size: 11px; color: var(--ink-3); }

::ng-deep .user-dot {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--river-deep); border: 3px solid white;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.15), 0 2px 6px rgba(63, 127, 170, 0.4);
}
::ng-deep .maplibregl-ctrl-attrib { font-size: 10px; }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: map / poi-detail / itinerary-detail compile. poi-list / itinerary-list / settings still pending.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/map/ src/app/core/geolocation.service.ts
git commit -m "feat(map): polished overlay, ngClass migration, recenter+watch fix"
```

---

## Task 17: Routes tab — itinerary list with active progress + Trips placeholder

**Files:**
- Modify: `src/app/features/itinerary-list/itinerary-list.component.ts`
- Modify: `src/app/features/itinerary-list/itinerary-list.component.html`
- Create: `src/app/features/itinerary-list/itinerary-list.component.css`
- Modify: `src/app/features/trips/trips.component.ts`
- Modify: `src/app/features/trips/trips.component.html`
- Create: `src/app/features/trips/trips.component.css`

- [ ] **Step 1: Replace itinerary-list component**

Replace `src/app/features/itinerary-list/itinerary-list.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ITINERARIES, getItinerary } from '../../data/itineraries';
import { ItineraryProgressService } from '../../core/itinerary-progress/itinerary-progress.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { CardComponent } from '../../ui/card/card.component';
import { DistanceProgressComponent } from '../../ui/charts/distance-progress.component';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-itinerary-list',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, CardComponent, DistanceProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-list.component.html',
  styleUrl: './itinerary-list.component.css',
})
export class ItineraryListComponent {
  protected readonly itineraries = ITINERARIES;
  protected readonly progress = inject(ItineraryProgressService);
  private i18n = inject(I18nService);

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly activeItinerary = computed(() => {
    const id = this.progress.activeId();
    return id ? getItinerary(id) : null;
  });

  protected readonly inactiveItineraries = computed(() => {
    const activeId = this.progress.activeId();
    return ITINERARIES.filter(i => i.id !== activeId);
  });

  hours(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  reachedRatio(itineraryId: string): { walked: number; total: number } {
    const it = getItinerary(itineraryId);
    if (!it) return { walked: 0, total: 1 };
    const reached = this.progress.progressFor(itineraryId)?.reachedStopIds.length ?? 0;
    return { walked: reached, total: Math.max(it.stops.length - 1, 1) };
  }
}
```

- [ ] **Step 2: Replace template**

Replace `src/app/features/itinerary-list/itinerary-list.component.html` with:
```html
<div class="rl">
  <header class="rl-head">
    <span class="rl-eyebrow">Belgrade · curated</span>
    <h1 class="rl-title">Routes</h1>
    <p class="rl-sub">Hand-curated walks through the city.</p>
  </header>

  @if (activeItinerary(); as it) {
    <section class="rl-active">
      <span class="rl-active-label">In progress</span>
      <a [routerLink]="['/itinerary', it.id]" class="block">
        <app-card variant="elevated">
          <div class="rl-active-body">
            <h2 class="rl-active-title">{{ it.title | i18nText }}</h2>
            <p class="rl-active-sub">{{ it.subtitle | i18nText }}</p>
            <app-distance-progress
              [walkedMeters]="reachedRatio(it.id).walked"
              [totalMeters]="reachedRatio(it.id).total" />
          </div>
        </app-card>
      </a>
    </section>
  }

  <ul class="rl-list">
    @for (it of inactiveItineraries(); track it.id) {
      <li>
        <a [routerLink]="['/itinerary', it.id]" class="block">
          <app-card>
            <div class="rl-card-body">
              <div class="rl-card-h">
                <h2 class="rl-card-title">{{ it.title | i18nText }}</h2>
                <span class="rl-card-meta">{{ hours(it.durationMinutes) }}</span>
              </div>
              <p class="rl-card-sub">{{ it.subtitle | i18nText }}</p>
              <div class="rl-card-vibes">
                @for (v of it.vibe; track v) {
                  <span class="rl-vibe">{{ v }}</span>
                }
                <span class="rl-vibe rl-vibe-stops">{{ it.stops.length }} stops</span>
              </div>
            </div>
          </app-card>
        </a>
      </li>
    }
  </ul>
</div>
```

- [ ] **Step 3: Implement styles**

Create `src/app/features/itinerary-list/itinerary-list.component.css`:
```css
:host { display: block; }
.rl { padding: env(safe-area-inset-top) 18px 96px; min-height: 100%; }
.rl-head { padding: 24px 0 12px; }
.rl-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: var(--accent); }
.rl-title { font-size: 32px; line-height: 1.05; margin: 4px 0 4px; color: var(--ink); }
.rl-sub { font-size: 14px; color: var(--ink-2); margin: 0; }

.rl-active { margin: 12px 0 18px; }
.rl-active-label { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); padding-bottom: 6px; }
.rl-active-body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.rl-active-title { font-size: 18px; line-height: 1.1; margin: 0; }
.rl-active-sub { font-size: 13px; color: var(--ink-2); margin: 0 0 4px; }

.rl-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.rl-card-body { padding: 16px 18px 18px; }
.rl-card-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.rl-card-title { font-size: 17px; line-height: 1.1; margin: 0; }
.rl-card-meta { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); white-space: nowrap; }
.rl-card-sub { font-size: 13px; color: var(--ink-2); margin: 0 0 10px; }
.rl-card-vibes { display: flex; flex-wrap: wrap; gap: 5px; }
.rl-vibe { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: var(--radius-pill); background: var(--accent-soft); color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
.rl-vibe-stops { background: rgba(0,0,0,0.05); color: var(--ink-2); }
```

- [ ] **Step 4: Replace Trips component to use the empty-state copy**

Replace `src/app/features/trips/trips.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { CardComponent } from '../../ui/card/card.component';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css',
})
export class TripsComponent {
  private i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);
}
```

Replace `src/app/features/trips/trips.component.html` with:
```html
<div class="trips">
  <header class="trips-head">
    <span class="trips-eyebrow">Beyond Belgrade</span>
    <h1 class="trips-title">{{ t().tabs.trips }}</h1>
  </header>

  <app-card variant="concrete">
    <div class="trips-empty">
      <span class="material-symbols-outlined" aria-hidden="true">directions_train</span>
      <h2>{{ t().trips.empty_title }}</h2>
      <p>{{ t().trips.empty_body }}</p>
    </div>
  </app-card>
</div>
```

Create `src/app/features/trips/trips.component.css`:
```css
:host { display: block; }
.trips { padding: env(safe-area-inset-top) 18px 96px; min-height: 100%; }
.trips-head { padding: 24px 0 16px; }
.trips-eyebrow { font-size: 11px; font-weight: 600; color: var(--transit-red); letter-spacing: 0.04em; }
.trips-title { font-size: 32px; line-height: 1.05; margin: 4px 0 0; color: var(--ink); }
.trips-empty { padding: 32px 24px; color: white; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.trips-empty .material-symbols-outlined { font-size: 36px; opacity: 0.9; }
.trips-empty h2 { font-size: 18px; margin: 4px 0 4px; }
.trips-empty p { font-size: 13px; line-height: 1.5; opacity: 0.9; margin: 0; }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: routes/itinerary-list and trips compile. poi-list / settings still pending.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/itinerary-list/ src/app/features/trips/
git commit -m "feat(routes,trips): Routes tab with active progress, Trips empty state"
```

---

## Task 18: Saved tab + Saved-aware POI list (re-used as Map's Places filter)

**Files:**
- Modify: `src/app/features/saved/saved.component.ts`
- Modify: `src/app/features/saved/saved.component.html`
- Create: `src/app/features/saved/saved.component.css`
- Modify: `src/app/features/poi-list/poi-list.component.ts`
- Modify: `src/app/features/poi-list/poi-list.component.html`
- Create: `src/app/features/poi-list/poi-list.component.css`

- [ ] **Step 1: Replace saved.component.ts**

Replace `src/app/features/saved/saved.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SavedService } from '../../core/saved/saved.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { CardComponent } from '../../ui/card/card.component';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { formatDistance } from '../../data/distance';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved.component.html',
  styleUrl: './saved.component.css',
})
export class SavedComponent {
  protected readonly saved = inject(SavedService);
  private proximity = inject(ProximityService);
  private i18n = inject(I18nService);
  protected readonly icons = CATEGORY_ICONS;
  protected fmtDistance = formatDistance;

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly enriched = computed(() => {
    return this.saved.list()
      .map(s => {
        const poi = getPoi(s.poiId);
        if (!poi) return null;
        const distance = this.proximity.distanceTo(poi);
        return { saved: s, poi, distance };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  });
}
```

- [ ] **Step 2: Replace saved.component.html**

Replace `src/app/features/saved/saved.component.html` with:
```html
<div class="sv">
  <header class="sv-head">
    <h1 class="sv-title">{{ t().tabs.saved }}</h1>
    <span class="sv-count">{{ enriched().length }}</span>
  </header>

  @if (enriched().length === 0) {
    <div class="sv-empty">
      <span class="material-symbols-outlined" aria-hidden="true">bookmark_border</span>
      <h2>{{ t().saved.empty_title }}</h2>
      <p>{{ t().saved.empty_body }}</p>
    </div>
  } @else {
    <ul class="sv-list">
      @for (item of enriched(); track item.poi.id) {
        <li>
          <a [routerLink]="['/poi', item.poi.id]" class="block">
            <app-card>
              <div class="sv-row">
                <div class="sv-thumb">
                  <span class="material-symbols-outlined" aria-hidden="true">{{ icons[item.poi.category] }}</span>
                </div>
                <div class="sv-info">
                  <span class="sv-name">{{ item.poi.name | i18nText }}</span>
                  <span class="sv-meta">{{ item.poi.address | i18nText }}</span>
                </div>
                @if (item.distance !== null) {
                  <span class="sv-dist">{{ fmtDistance(item.distance) }}</span>
                }
              </div>
            </app-card>
          </a>
        </li>
      }
    </ul>
  }
</div>
```

- [ ] **Step 3: Implement saved.component.css**

Create `src/app/features/saved/saved.component.css`:
```css
:host { display: block; }
.sv { padding: env(safe-area-inset-top) 18px 96px; min-height: 100%; }
.sv-head { display: flex; justify-content: space-between; align-items: baseline; padding: 24px 0 16px; }
.sv-title { font-size: 32px; line-height: 1.05; margin: 0; color: var(--ink); }
.sv-count { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }

.sv-empty { padding: 48px 24px; text-align: center; color: var(--ink-2); }
.sv-empty .material-symbols-outlined { font-size: 48px; color: var(--accent); opacity: 0.6; }
.sv-empty h2 { font-size: 18px; margin: 12px 0 6px; color: var(--ink); }
.sv-empty p { font-size: 13px; line-height: 1.5; margin: 0; }

.sv-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.sv-row { padding: 12px 14px; display: flex; align-items: center; gap: 14px; }
.sv-thumb {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sv-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sv-name { font-size: 14px; font-weight: 600; color: var(--ink); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.sv-meta { font-size: 12px; color: var(--ink-3); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.sv-dist { font-size: 12px; font-weight: 600; color: var(--ink-2); white-space: nowrap; }
```

- [ ] **Step 4: Replace poi-list to use new schema**

Replace `src/app/features/poi-list/poi-list.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { POIS, CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/pois';
import { POI } from '../../data/types';
import { GeolocationService } from '../../core/geolocation.service';
import { ProximityService } from '../../core/proximity.service';
import { HoursService } from '../../core/hours/hours.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { ChipComponent } from '../../ui/chip/chip.component';
import { formatDistance, walkingMinutes } from '../../data/distance';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

type Filter = POI['category'] | 'all' | 'open-now';

@Component({
  selector: 'app-poi-list',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poi-list.component.html',
  styleUrl: './poi-list.component.css',
})
export class PoiListComponent {
  protected readonly filters: Filter[] = ['all', 'open-now', 'sight', 'cuisine', 'cafe', 'museum', 'viewpoint', 'park', 'nightlife'];
  protected readonly labels = CATEGORY_LABELS;
  protected readonly icons = CATEGORY_ICONS;
  protected readonly geo = inject(GeolocationService);
  private proximity = inject(ProximityService);
  private hours = inject(HoursService);
  private i18n = inject(I18nService);
  protected readonly filter = signal<Filter>('all');

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly visible = computed(() => {
    const f = this.filter();
    const ranked = this.proximity.ranked();
    const now = new Date();

    const matchesFilter = (poi: POI) => {
      if (f === 'all') return true;
      if (f === 'open-now') {
        return poi.hours ? this.hours.isOpenAt(poi.hours.raw, now).state === 'open' : false;
      }
      return poi.category === f;
    };

    if (ranked.length) {
      return ranked
        .filter(r => matchesFilter(r.poi))
        .map(r => ({ poi: r.poi, distance: r.meters as number | null, walk: r.walkMinutes as number | null }));
    }
    return POIS
      .filter(matchesFilter)
      .map(p => ({ poi: p, distance: null as number | null, walk: null as number | null }))
      .sort((a, b) => a.poi.name.en.localeCompare(b.poi.name.en));
  });

  filterLabel(f: Filter): string {
    if (f === 'all') return 'All';
    if (f === 'open-now') return this.t().poi.open_now;
    return this.labels[f];
  }

  fmtDistance(meters: number | null): string {
    return meters === null ? '' : formatDistance(meters);
  }

  fmtWalk(meters: number | null): string {
    return meters === null ? '' : this.t().map.min_walk.replace('{n}', walkingMinutes(meters).toString());
  }

  enableGps(): void {
    this.geo.start();
  }
}
```

Replace `src/app/features/poi-list/poi-list.component.html` with:
```html
<div class="pl">
  <header class="pl-head">
    <div class="pl-head-row">
      <h1 class="pl-title">Places</h1>
      <span class="pl-count">{{ visible().length }} found</span>
    </div>

    @if (!geo.position() && geo.permission() !== 'denied') {
      <button type="button" (click)="enableGps()" class="pl-gps-btn">
        <span class="material-symbols-outlined" aria-hidden="true" style="font-size:16px;">my_location</span>
        Enable GPS to sort by distance
      </button>
    }

    <div class="pl-chip-row">
      @for (f of filters; track f) {
        <button type="button" (click)="filter.set(f)"
                class="pl-chip"
                [class.is-active]="filter() === f">
          {{ filterLabel(f) }}
        </button>
      }
    </div>
  </header>

  <ul class="pl-list">
    @for (item of visible(); track item.poi.id) {
      <li>
        <a [routerLink]="['/poi', item.poi.id]" class="pl-row">
          <div class="pl-thumb">
            <span class="material-symbols-outlined" aria-hidden="true">{{ icons[item.poi.category] }}</span>
          </div>
          <div class="pl-info">
            <span class="pl-name">{{ item.poi.name | i18nText }}</span>
            <span class="pl-addr">{{ item.poi.address | i18nText }}</span>
          </div>
          @if (item.distance !== null) {
            <div class="pl-dist">
              <span class="pl-dist-m">{{ fmtDistance(item.distance) }}</span>
              <span class="pl-dist-w">{{ fmtWalk(item.distance) }}</span>
            </div>
          }
        </a>
      </li>
    }
  </ul>
</div>
```

Create `src/app/features/poi-list/poi-list.component.css`:
```css
:host { display: block; }
.pl { padding-bottom: 96px; min-height: 100%; }
.pl-head { padding: 24px 18px 12px; position: sticky; top: 0; background: var(--bg-warm-1); border-bottom: 1px solid rgba(0,0,0,0.05); z-index: 5; }
.pl-head-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.pl-title { font-size: 28px; line-height: 1.05; margin: 0; }
.pl-count { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
.pl-gps-btn { width: 100%; padding: 9px 12px; border-radius: var(--radius-pill); background: var(--ink); color: white; border: none; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px; cursor: pointer; }
.pl-chip-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin: 0 -18px; padding-inline: 18px; }
.pl-chip-row::-webkit-scrollbar { display: none; }
.pl-chip { flex-shrink: 0; padding: 6px 12px; border-radius: var(--radius-pill); background: transparent; color: var(--ink-2); border: 1px solid rgba(0,0,0,0.1); font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer; }
.pl-chip.is-active { background: var(--ink); color: white; border-color: var(--ink); }

.pl-list { list-style: none; padding: 0; margin: 0; }
.pl-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid rgba(0,0,0,0.04); text-decoration: none; color: inherit; }
.pl-thumb { width: 44px; height: 44px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pl-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pl-name { font-size: 14px; font-weight: 600; color: var(--ink); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.pl-addr { font-size: 12px; color: var(--ink-3); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.pl-dist { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.pl-dist-m { font-size: 13px; font-weight: 600; color: var(--ink); font-feature-settings: "tnum"; }
.pl-dist-w { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: poi-list / saved compile. settings is the last failing component.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/saved/ src/app/features/poi-list/
git commit -m "feat(saved,places): Saved tab + redesigned Places list with open-now filter"
```

---

## Task 19: Settings redesign — language toggle + currency + offline pack

**Files:**
- Modify: `src/app/features/settings/settings.component.ts`
- Modify: `src/app/features/settings/settings.component.html`
- Create: `src/app/features/settings/settings.component.css`

- [ ] **Step 1: Replace settings component**

Replace `src/app/features/settings/settings.component.ts` with:
```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilePackService } from '../../core/tile-pack.service';
import { GeolocationService } from '../../core/geolocation.service';
import { PwaInstallService } from '../../core/pwa-install.service';
import { I18nService } from '../../core/i18n/i18n.service';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  protected readonly tilePack = inject(TilePackService);
  protected readonly geo = inject(GeolocationService);
  protected readonly pwa = inject(PwaInstallService);
  protected readonly i18n = inject(I18nService);

  protected readonly confirmingClear = signal(false);

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly tilePackSize = computed(() => {
    const meta = this.tilePack.meta();
    if (!meta) return null;
    return this.formatBytes(meta.bytes);
  });

  protected readonly tilePackAge = computed(() => {
    const meta = this.tilePack.meta();
    if (!meta) return null;
    const days = Math.floor((Date.now() - meta.storedAt) / (1000 * 60 * 60 * 24));
    if (days === 0) return this.t().settings.downloaded_today;
    if (days === 1) return this.t().settings.downloaded_yesterday;
    return this.t().settings.downloaded_days.replace('{n}', days.toString());
  });

  async clearPack(): Promise<void> {
    this.confirmingClear.set(false);
    await this.tilePack.clear();
  }

  async install(): Promise<void> {
    await this.pwa.promptInstall();
  }

  setLocale(loc: 'en' | 'sr'): void {
    this.i18n.setLocale({ locale: loc, script: 'Latn' });
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
```

Replace `src/app/features/settings/settings.component.html` with:
```html
<div class="st">
  <header class="st-head">
    <h1 class="st-title">Settings</h1>
  </header>

  <section>
    <h2 class="st-section">{{ t().settings.language }}</h2>
    <div class="st-card st-card-row">
      <button type="button" (click)="setLocale('en')"
              class="st-lang"
              [class.is-active]="i18n.locale().locale === 'en'">
        {{ t().settings.language_en }}
      </button>
      <button type="button" (click)="setLocale('sr')"
              class="st-lang"
              [class.is-active]="i18n.locale().locale === 'sr'">
        {{ t().settings.language_sr }}
      </button>
    </div>
  </section>

  <section>
    <h2 class="st-section">{{ t().settings.currency }}</h2>
    <div class="st-card st-card-info">
      <strong>{{ t().settings.currency_rsd }}</strong>
      <span>EUR shown in parentheses</span>
    </div>
  </section>

  <section>
    <h2 class="st-section">{{ t().settings.offline_pack }}</h2>
    <div class="st-card">
      <div class="st-card-row st-card-row-info">
        <div>
          <strong>Belgrade map pack</strong>
          <span>
            @if (tilePack.status() === 'ready') {
              {{ tilePackSize() }} · {{ tilePackAge() }}
            } @else if (tilePack.status() === 'missing') {
              Not downloaded
            } @else if (tilePack.status() === 'downloading') {
              Downloading…
            } @else {
              {{ tilePack.error() ?? 'Status unknown' }}
            }
          </span>
        </div>
        <span class="st-status-dot"
              [class.is-ready]="tilePack.status() === 'ready'"
              [class.is-loading]="tilePack.status() === 'downloading'"
              [class.is-error]="tilePack.status() === 'error' || tilePack.status() === 'missing'"></span>
      </div>
      <div class="st-card-actions">
        @if (tilePack.status() === 'missing' || tilePack.status() === 'error') {
          <button type="button" (click)="tilePack.download()" class="st-btn st-btn-primary">Download</button>
        }
        @if (tilePack.status() === 'ready') {
          @if (!confirmingClear()) {
            <button type="button" (click)="confirmingClear.set(true)" class="st-btn st-btn-secondary">Clear pack</button>
            <button type="button" (click)="tilePack.download()" class="st-btn st-btn-secondary">Re-download</button>
          } @else {
            <button type="button" (click)="confirmingClear.set(false)" class="st-btn st-btn-secondary">{{ t().common.cancel }}</button>
            <button type="button" (click)="clearPack()" class="st-btn st-btn-danger">{{ t().common.confirm }}</button>
          }
        }
      </div>
    </div>
  </section>

  <section>
    <h2 class="st-section">{{ t().settings.gps }}</h2>
    <div class="st-card st-card-row st-card-row-info">
      <div>
        <strong>{{ t().settings.gps }}</strong>
        <span>{{ t().settings.permission }}: {{ geo.permission() }}@if (geo.isWatching()) { · {{ t().settings.tracking }} }</span>
      </div>
      @if (!geo.isWatching()) {
        <button type="button" (click)="geo.start()" class="st-btn st-btn-primary">{{ t().settings.start }}</button>
      } @else {
        <button type="button" (click)="geo.stop()" class="st-btn st-btn-secondary">{{ t().settings.stop }}</button>
      }
    </div>
  </section>

  @if (pwa.isIos() && !pwa.isStandalone()) {
    <section>
      <h2 class="st-section">{{ t().settings.install }}</h2>
      <div class="st-card st-card-info">{{ t().settings.install_ios }}</div>
    </section>
  } @else if (pwa.canPrompt()) {
    <button type="button" (click)="install()" class="st-btn st-btn-primary st-install">{{ t().settings.install }}</button>
  }

  <p class="st-foot">Beograde · offline-first</p>
</div>
```

Create `src/app/features/settings/settings.component.css`:
```css
:host { display: block; }
.st { padding: env(safe-area-inset-top) 18px 96px; min-height: 100%; }
.st-head { padding: 24px 0 16px; }
.st-title { font-size: 32px; line-height: 1.05; margin: 0; color: var(--ink); }

section { margin-bottom: 24px; }
.st-section { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 8px; }
.st-card { background: var(--surface); border-radius: var(--radius-card); padding: 14px 16px; box-shadow: var(--shadow-card); }
.st-card-row { display: flex; gap: 8px; align-items: center; }
.st-card-row-info { justify-content: space-between; align-items: flex-start; }
.st-card-row-info strong { display: block; font-size: 14px; }
.st-card-row-info span { display: block; font-size: 12px; color: var(--ink-2); margin-top: 2px; }
.st-card-info { display: flex; flex-direction: column; gap: 2px; font-size: 13px; line-height: 1.5; color: var(--ink-2); }
.st-card-info strong { color: var(--ink); }
.st-card-actions { display: flex; gap: 8px; margin-top: 12px; }

.st-lang {
  flex: 1; padding: 10px 12px; border-radius: var(--radius-card);
  background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06);
  font-size: 13px; font-weight: 600; color: var(--ink-2); cursor: pointer;
}
.st-lang.is-active { background: var(--ink); color: white; border-color: var(--ink); }

.st-btn { flex: 1; padding: 10px; border: none; border-radius: var(--radius-card); font-size: 12px; font-weight: 600; cursor: pointer; }
.st-btn-primary { background: var(--accent); color: white; }
.st-btn-secondary { background: rgba(0,0,0,0.05); color: var(--ink); }
.st-btn-danger { background: var(--bad); color: white; }
.st-install { width: 100%; padding: 14px; }

.st-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; align-self: center; }
.st-status-dot.is-ready { background: var(--good); }
.st-status-dot.is-loading { background: var(--warn); }
.st-status-dot.is-error { background: var(--bad); }

.st-foot { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); text-align: center; margin: 32px 0 0; }
```

- [ ] **Step 2: Type-check + lint**

Run:
```bash
npx tsc --noEmit -p tsconfig.json
npm run lint
```
Expected: both pass cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/settings/
git commit -m "feat(settings): language toggle, currency note, offline pack manager"
```

---

## Task 20: README rewrite + scripts/README update

**Files:**
- Modify: `README.md`
- Modify: `scripts/README.md`

- [ ] **Step 1: Rewrite the top-level README**

Replace `README.md` with:
```markdown
# Beograde

Offline-first Belgrade city guide. Installs to the home screen as a PWA on iOS
and Android, works fully offline once the map pack has been downloaded, uses
GPS to surface nearby places, and walks you through curated itineraries.

## What you get

- **Hi-res offline map** — MapLibre GL rendering a single PMTiles file
  (~50–100 MB) stored in IndexedDB.
- **32 city POIs**, each with bilingual content (English + Serbian Latin),
  structured opening hours, and provenance chips so you see *why* we trust
  the data.
- **6 hand-authored itineraries** with stop-by-stop timing, a visual timeline,
  and persisted progress that resumes across sessions.
- **Open-now status** — opening hours parsed via the OSM `opening_hours`
  grammar; "open now" is correct or unknown, never wrong.
- **GPS proximity** — every POI sorts by walking distance from your current
  fix; the active itinerary highlights the next stop within 100 m.
- **Saved places** — bookmark POIs to a Saved tab persisted to IndexedDB.
- **Installable PWA** — Add to Home Screen on iPhone/Android, no app store,
  no developer license.

## Tech

- Angular 21 (zoneless, signals, standalone components)
- MapLibre GL + PMTiles
- `@angular/service-worker` for app shell + content cache
- `idb-keyval` for offline pack, saved places, itinerary progress
- `opening_hours` for hours parsing
- Tailwind v4 + Soft Modern design tokens + Belgrade-specific identity layer

No backend. No API keys. No tracking.

## Roadmap

- **Phase 1a (current):** redesigned UI, structured POI data, three core
  charts, persisted progress, every known bug fixed.
- **Phase 1b:** day trips by train and bus (Novi Sad, Topola, Avala …) with
  static transit schedules, full Serbian Cyrillic, image pipeline,
  remaining charts (elevation, reliability quadrant, travel ribbon).
- **Phase 2:** Capacitor wrap for App Store and Play Store distribution.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

The dev server runs without the offline tile pack — the map screen will show
the "Download Belgrade pack" CTA. To exercise the full experience, build the
pack first (see `scripts/README.md`) and copy `belgrade.pmtiles` to
`src/assets/tiles/`.

## Build for production

```bash
npm run build
```

Output: `dist/app/browser/`. Ship the contents to your web root.

## Deploy to Hetzner

See [`deploy/README.md`](deploy/README.md) for the nginx config, certbot setup,
and the rsync command. Key requirement: nginx must serve the PMTiles file with
**byte-range** support (`HTTP 206`) — already configured in `deploy/nginx.conf`.

## Install on iPhone

1. Open the deployed URL in **Safari** (must be HTTPS).
2. Tap **Share → Add to Home Screen**.
3. Open the app from the new icon.
4. Tap **Download Belgrade pack** on first run, on Wi-Fi.
5. After that, airplane mode is fine.

iOS evicts PWA storage after roughly 7 days of non-use. Phase 2 (Capacitor
wrap) eliminates this; for the PWA path, just reopen the app within a week.

## Repo layout

```
src/app/
├── core/                       # services: geolocation, proximity, tile-pack,
│                               # i18n, hours, saved, itinerary-progress
├── data/                       # POI/itinerary types, accessors, distance
├── features/                   # home, map, poi-detail, poi-list, routes,
│                               # itinerary-detail, trips, saved, settings
└── ui/                         # Card, Chip, HeroCard, BottomNav,
                                # TwoRiversMark, charts, i18n pipe

src/styles/                     # soft-modern.css + belgrade-tokens.css
src/i18n/                       # en.json + sr-Latn.json
src/assets/
├── pois.json
├── itineraries/                # GeoJSON LineString per itinerary
├── styles/                     # MapLibre style for the offline pack
├── tiles/                      # belgrade.pmtiles  (built, .gitignored)
└── fonts/                      # SDF glyphs        (built, .gitignored)

scripts/                        # tile/font build, POI migration
deploy/                         # nginx config + Hetzner deploy guide
docs/superpowers/               # design specs + implementation plans
```

## Data attribution

Map data © OpenStreetMap contributors, ODbL.
```

- [ ] **Step 2: Add the new migration script to scripts/README**

In `scripts/README.md`, after the existing scripts table, add:
```markdown

| `migrate-pois.mjs` | rewrites `src/assets/pois.json` to v2 schema (bilingual + structured hours + provenance) | One-shot, already run during Phase 1a; idempotent. |
```

- [ ] **Step 3: Commit**

```bash
git add README.md scripts/README.md
git commit -m "docs: rewrite README for the redesigned app"
```

---

## Task 21: Final integration verification

**Files:** none modified — verification only.

- [ ] **Step 1: Run full test suite**

Run:
```bash
npm test -- --run
```
Expected: every spec passes. There should be at minimum:
- `src/app/data/types.spec.ts`
- `src/app/core/i18n/i18n.spec.ts`
- `src/app/core/i18n/i18n.service.spec.ts`
- `src/app/core/hours/hours.service.spec.ts`
- `src/app/core/saved/saved.service.spec.ts`
- `src/app/core/itinerary-progress/itinerary-progress.service.spec.ts`
- `src/app/ui/i18n-text/i18n-text.pipe.spec.ts`
- `src/app/ui/chip/chip.component.spec.ts`
- `src/app/ui/bottom-nav/bottom-nav.component.spec.ts`
- `src/app/ui/charts/distance-progress.component.spec.ts`
- `src/app/app.spec.ts`

- [ ] **Step 2: Run lint**

Run:
```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Run production build**

Run:
```bash
npm run build
```
Expected: succeeds. Initial bundle (gzipped) should land below the 1 MB warning budget already declared in `angular.json`. Note the actual size in the commit message of the next step.

- [ ] **Step 4: Run dev server and walk the golden path**

In one terminal:
```bash
npm run dev
```

Open `http://localhost:3000` in Chrome (mobile emulation, iPhone 14). Verify:
1. Lands on `/home`. Hero card shows a Today's pick.
2. Bottom nav has 5 tabs; Home is highlighted.
3. Tapping Map shows the "Download Belgrade pack" overlay (no tile file in dev).
4. Tapping Routes shows 6 itineraries; tapping one shows the timeline chart and stops list.
5. Pressing **Start** on an itinerary surfaces the distance-progress bar.
6. Tapping a POI shows the redesigned detail with provenance chips (likely empty in Phase 1a, since automated provenance pipeline ships in 1b — this is expected and renders correctly), hours heatmap (when hours are present), and the bookmark toggle.
7. Bookmarking → Saved tab shows the entry.
8. Settings: language toggle works, switches every UI string.

- [ ] **Step 5: Walk the offline path (optional sanity)**

Open Chrome DevTools → Network → set throttling to **Offline**. Reload. Tabs should still navigate, lists should render, and the Map should show its "missing pack" overlay (network-independent).

- [ ] **Step 6: Final commit**

If any small fixes were applied in Step 4, commit them now:
```bash
git add -A
git commit -m "fix: integration verification fixes"
```

If everything was clean, no commit is needed. Done.

---

## Self-review checklist (run after writing this plan; fix inline)

- **Spec coverage:**
  - §4 IA five-tab nav → Task 12.
  - §6 Data model → Tasks 3, 7, 8.
  - §7 Visual system + Belgrade layer → Task 2.
  - §8 Provenance chips → Task 14 (manual `sources` in Phase 1a; Phase 1b automates).
  - §10 Three core charts → Task 11.
  - §11 Bug fix matrix → Tasks 14, 15, 16, 19.
  - §12 i18n → Task 4.
  - §15 Itinerary progress + Saved → Tasks 6, 7, 14, 15, 17, 18.
  - §17 Accessibility → Tasks 9, 10, 11, 14, 15.
- **Placeholder scan:** no `TBD`, `TODO`, `implement later` strings in any task. Steps that change code show the code.
- **Type consistency:** `Bilingual`, `OpeningHours`, `TransitInfo`, `ReliabilityScore`, `editorialConfidence` all defined in Task 3 and used unchanged in later tasks. Service signatures (`SavedService.add/remove/isSaved`, `ItineraryProgressService.start/markReached/clear/progressFor/activeId`, `HoursService.isOpenAt/weeklyGrid`, `I18nService.locale/setLocale/cyrillicEnabled`) match across definition and usage.

If any issue surfaces during execution, fix it inline and proceed.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-04-beograde-redesign-phase-1a.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Each subagent gets a clean context and is instructed to execute exactly one task at a time.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach?
