# Beograde Redesign — Design Spec

**Date:** 2026-05-04
**Status:** Draft, pending user review
**Owner:** Rahat

## 1. Goal

Turn the existing Belgrade PWA into a polished, mobile-first city guide that:

- Looks and feels like a designed product, not a prototype.
- Trusts user with **defensible** POI data (no fake-review surface).
- Reaches stores via Capacitor without throwing away the Angular work.
- Covers Belgrade *and* nearby attractions reachable by train or public transport.
- Visualises itineraries with charts and graphs, not just lists.
- Stays offline-first.

## 2. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Platform | **Polished PWA now, Capacitor wrap as Phase 2** |
| 2 | Language | **English + Serbian (Latin + Cyrillic)**, structured for more later |
| 3 | Regional radius | **~100 km** (Belgrade + day-trips reachable by train/bus) |
| 4 | POI accuracy | **Multi-source reliability score**, four provenance chips per POI |
| 5 | Visual direction | **Soft Modern** (warm gradients, rounded surfaces, friendly type) |
| 6 | Navigation | **Home feed + Map tab** — five-tab bottom nav, Home is a curated magazine feed |
| - | Image strategy | Hybrid: Wikimedia Commons + curated AVIF/WebP, LQIP placeholders |
| - | Currency | RSD primary, EUR in parens |
| - | Default language | Browser locale, fallback English; user-selectable; remembered |
| - | Itinerary progress | Persisted to IndexedDB; resumes on relaunch |

## 3. Non-goals

- True native rewrite (React Native / Flutter).
- User-generated reviews or ratings.
- Live API for hours / pricing (would break offline-first).
- Booking, payments, ticketing.
- Cycling / driving routing.
- More than two languages in v1 — EN + SR; the data model supports more, content does not. SR ships in two scripts (Latin + Cyrillic) but counts as one language.

## 4. Information architecture

The app uses a five-tab bottom navigation. The **Home** tab is a curated magazine feed — the answer to "what should I do right now?" — and is where charts/visuals live. Map is a peer tab (not the home screen).

```
┌─ App shell ──────────────────────────┐
│  ─── Top header (per-tab) ──────     │
│                                       │
│  Tab content (scrollable)             │
│                                       │
│ ┌─ Bottom nav (5 tabs) ───────────┐ │
│ │ Home · Map · Routes · Trips · Saved│
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Tabs (left to right)

1. **Home** *(default landing)* — magazine feed:
   - Greeting + weather + local time strip.
   - **Today's pick** — hero card: a single itinerary chosen by weather + time of day.
   - **Open now near you** — horizontal scroll row of 3–5 POIs.
   - **Day trips by train** — horizontal scroll row of regional POIs with transit card teaser.
   - **Editorial story cards** — curated long-form sections (e.g. "How to read a Belgrade kafana", "What to eat at a splav").
   - **Quick filters chip row** at the very top: All · Sights · Cuisine · Open now · Saved (taps deep-link to filtered Map tab).
2. **Map** — full-screen MapLibre map.
   - Top: search bar + filter chips overlay.
   - Bottom: floating "Nearest 3" cards (always visible when GPS on).
   - Right: GPS recenter + tracking toggle.
   - POI markers categorical (icon + colour).
   - Active itinerary line when one is in progress.
3. **Routes** — itinerary list.
   - Active itinerary (if any) pinned at top with progress bar.
   - Below: full itinerary catalogue with filter chips (vibe / duration).
4. **Trips** — out-of-city day-trip catalogue.
   - Grouped by transit mode (Soko fast train · Srbija Voz · BG VOZ · Lasta bus · GSP city bus).
   - Each card surfaces transit info upfront (line · duration · fare).
5. **Saved** — user's saved places + recent visits, with empty state CTA.

Settings is reached from the top-right icon on the Home tab (not a tab — not used often enough to deserve one).

POI detail, Itinerary detail, and Day-trip detail are pushed routes (not modal sheets), with a back arrow and shared-element image hero.

## 5. Screen inventory

| Screen | Purpose | Key states |
|---|---|---|
| Home | Default landing; "what should I do?" | first-run, offline-pack-missing, ready, gps-off, weather-failed |
| Map | Browse / locate | offline-pack-missing, downloading, ready, gps-off, error |
| Routes | List itineraries; resume active one | active-running, no-active, empty-filter |
| Trips | Day-trip catalogue | grouped by transit mode |
| Saved | Quick access | empty, populated |
| POI detail | Decide whether to go | full hours, hours-collapsed, no-image, not-found |
| Itinerary detail | Plan/walk a route | not-started, walking, finished |
| Day-trip detail | POI + transit card | next departure now/today/tomorrow |
| Settings | Configure | language, currency, offline pack, GPS, install |
| First-run | Welcome + pack download | language pick, pack download, GPS prompt |

## 6. Data model

### POI

```ts
type POI = {
  id: string;
  region: 'city' | 'metro' | 'day-trip';
  category: Category;

  // Bilingual primary fields
  name: { en: string; sr_lat: string; sr_cyr: string };
  description: { en: string; sr_lat: string; sr_cyr: string };
  address: { en: string; sr_lat: string; sr_cyr: string };

  // Geo
  lng: number;
  lat: number;

  // Hours: structured so 'open now' is computable
  hours?: OpeningHours;        // OSM opening_hours grammar, parsed
  // Pricing: RSD primary, EUR derived from a stored snapshot rate
  pricing?: { tier: '€' | '€€' | '€€€'; rsd?: { min: number; max: number } };

  tags: string[];
  images: ImageAsset[];

  // PROVENANCE (the new bit)
  verifiedAt: string;            // ISO date
  sources: SourceRef[];          // see below
  reliability: ReliabilityScore; // computed, stored
};

type SourceRef =
  | { kind: 'wikipedia';        url: string; lang: 'en' | 'sr' }
  | { kind: 'osm';              ref: string }                      // e.g. way/123
  | { kind: 'official';         url: string; org: string }         // tob.rs, tourism board
  | { kind: 'google-places';    placeId: string; reviewCount: number; rating: number; checkedAt: string }
  | { kind: 'tripadvisor';      url: string; reviewCount: number; rating: number; checkedAt: string };

type ReliabilityScore = {
  score: number;             // 0..100
  checks: {
    wikipedia: boolean;
    osm: boolean;
    official: boolean;
    crowdsourced: boolean;   // true iff (google.reviewCount>=500 || tripadvisor.reviewCount>=200)
  };
};

type ImageAsset = {
  src: string;               // assets/poi/<id>/<n>.avif
  width: number;
  height: number;
  lqip: string;              // base64, 8x8, ~150 bytes
  credit: string;            // photographer or "Wikimedia Commons / @user"
  license: string;           // 'CC BY-SA 4.0', 'CC0', etc.
  source?: string;           // URL to original
};

type OpeningHours = {
  raw: string;               // OSM grammar, e.g. "Tu-Su 10:00-18:00; Th 10:00-20:00"
  periods: Array<{           // pre-parsed for fast 'open now' check
    weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    open: string;            // "10:00"
    close: string;           // "18:00"
  }>;
  notes?: { en: string; sr_lat: string; sr_cyr: string };
};
```

### Itinerary

```ts
type Itinerary = {
  id: string;
  title:   { en: string; sr_lat: string; sr_cyr: string };
  subtitle:{ en: string; sr_lat: string; sr_cyr: string };
  durationMinutes: number;
  vibe: string[];                  // tag list
  stops: ItineraryStop[];
  geometryUrl: string;
  // Visualisation source data, served alongside geometry:
  elevationProfileUrl?: string;    // GeoJSON feature with z values per coord
  bestStartHourLocal?: number;     // 0..23, used by Today's pick logic
};

type ItineraryStop = {
  poiId: string;
  arrivalOffsetMinutes: number;
  durationMinutes: number;
  notes?: { en: string; sr_lat: string; sr_cyr: string };
};
```

### Transit (regional)

```ts
type TransitInfo = {
  mode: 'soko' | 'regional-train' | 'suburban-train' | 'intercity-bus' | 'city-bus';
  fromStation: { en: string; sr_lat: string; sr_cyr: string }; // e.g. "Belgrade Centre (Prokop)"
  toStation:   { en: string; sr_lat: string; sr_cyr: string };
  durationMinutes: number;        // typical, not real-time
  frequency: { perDay: number; firstHour: number; lastHour: number };
  fareRSD: { min: number; max: number };
  bookingUrl?: string;
  notes?: { en: string; sr_lat: string; sr_cyr: string };
};

// POI in 'day-trip' region carries one or more TransitInfo entries.
```

### Saved / progress

```ts
type SavedPlace = { poiId: string; savedAt: number; note?: string };
type ItineraryProgress = {
  itineraryId: string;
  startedAt: number;
  reachedStopIds: string[];      // by poiId
  lastUpdatedAt: number;
};

// IndexedDB keys
//   tile-pack:belgrade:v1            (Blob)
//   tile-pack:belgrade:v1:meta       (TilePackMeta)
//   prefs                            ({ lang, script, currency })
//   saved:list                       (SavedPlace[])
//   itinerary:progress:<id>          (ItineraryProgress)
//   image-cache:<sha>                (Blob, lazy fetched)
```

## 7. Visual system (Soft Modern)

### Type

- **Display / headings:** Inter 700, letterspacing -0.02em
- **Body:** Inter 400/500
- **Numerics & metadata:** Inter Tabular numerals (no monospace this round — feels too brutalist)
- **Cyrillic:** Inter has full Cyrillic support, no fallback needed

### Palette

| Token | Hex | Use |
|---|---|---|
| `--bg-warm-1` | `#FFF8F1` | App background top |
| `--bg-warm-2` | `#F4ECE0` | App background bottom |
| `--surface` | `#FFFFFF` | Cards |
| `--ink` | `#2A2018` | Primary text |
| `--ink-2` | `#7A6A5A` | Secondary text |
| `--ink-3` | `#9A8B7A` | Tertiary / metadata |
| `--accent` | `#B8540C` | Primary brand (replaces `#FF6321`) |
| `--accent-soft` | `#FFE3CC` | Pills, hover, soft surfaces |
| `--good` | `#2D7A1F` | Verified/open chips |
| `--good-soft` | `#E0F2DC` | Verified background |
| `--warn` | `#B8810C` | "Closes soon" |
| `--bad` | `#B8200C` | Error |
| `--map-water` | `#A4C8E0` | Maintained for offline tiles |
| `--map-park` | `#D6E8C4` | Maintained |

### Surface system

- **Cards:** `border-radius: 20–24px`, `box-shadow: 0 6px 18px rgba(140,80,30,0.10), 0 1px 3px rgba(140,80,30,0.05)`.
- **Hero cards (Today's pick):** `border-radius: 24px`, gradient surface, white type, soft inner light.
- **Bottom nav:** frosted `rgba(255,248,241,0.92); backdrop-filter: blur(12px)`, top hairline, safe-area-inset bottom padding.
- **Pills:** rounded-full, soft accent backgrounds.

### Motion

- **Tab transition:** cross-fade 180ms, no slide (route hierarchy is flat at the tab level).
- **Detail push:** slide-from-right 280ms with shared-element image hero morph from card thumbnail.
- **Horizontal carousel scroll:** snap, momentum, no easing override.
- **Map fly-to:** 600ms duration on focus.

### Spacing / density

- Body text 15px, secondary 13px, metadata 11px. (Bigger than the current 10–12px metadata, which was hard to read in sun.)
- Touch targets ≥ 44 × 44 px.

## 8. POI accuracy / provenance system

### The four checks

A POI's reliability score is determined by how many of these are true:

1. **Wikipedia** — has a (non-stub) article in EN or SR.
2. **OSM** — exists with full tags (name, address, opening_hours).
3. **Official** — listed by a recognised authority (Belgrade Tourism Organisation `tob.rs`, City of Belgrade, ministry).
4. **Crowdsourced (volume threshold)** — Google Places review count ≥ 500 *or* TripAdvisor review count ≥ 200. Volume threshold neutralises buy-a-review noise; we never display individual review text or trust counts below the threshold.

Score: each check worth 25 points. We never display individual review text, never display a low-volume rating, never call live APIs at runtime — provenance is computed offline at build time and baked into the dataset.

### UI: provenance chips

Every POI card (list or detail) shows up to four small chips:

- `WIKI ✓` (good colour) — link opens Wikipedia article in browser.
- `OSM ✓` — link to OSM way/relation.
- `OFFICIAL ✓` — link to the official source.
- `8.4K REV` — only shown when threshold met; never a star rating, just a volume signal.

Last verified date is shown discreetly on detail view: `Verified 4 May 2026`. POIs with `verifiedAt` older than 180 days display a soft warning chip.

### Authoring tooling

A new build-time script `scripts/build-provenance.mjs`:

- Reads `pois.json` source.
- For each POI, checks Wikipedia API (no quota), OSM Overpass (no quota), and uses cached Google Places JSON (developer manually pastes the JSON into `data/provenance-cache/<id>.json` to avoid live API calls — we treat this as a once-per-quarter manual audit).
- Emits the enriched `pois.compiled.json` consumed at runtime.

## 9. Regional / day-trip system

POIs with `region: 'day-trip'` (e.g. Novi Sad, Topola/Oplenac) carry a `TransitInfo` block. The **Trips** tab groups them by `mode`:

- **Soko fast train** — Belgrade ↔ Novi Sad (36 min).
- **Srbija Voz regional** — slower trains (e.g. to Smederevo).
- **BG VOZ** — suburban (Pančevo etc.).
- **Lasta intercity bus** — Topola, Avala, Kosmaj.
- **GSP city bus** — Avala (bus 401 from Voždovac).

Each card shows: cover image, name, mode pill, "X min · ~Y RSD · departs hourly", "Last service 21:00" if relevant. Tapping opens a Day-trip detail with a **transit card** at the very top above the POI body.

### Initial day-trip POI list (Phase 1 content)

- **Inside ~30 km:** Avala (existing), Smederevo Fortress, Pančevo (centre), Kosmaj.
- **30–100 km:** Novi Sad (centre), Petrovaradin Fortress, Sremski Karlovci, Topola/Oplenac (Karađorđević mausoleum), Fruška Gora monasteries (Krušedol, Hopovo), Viminacium Roman site.

≈18 new POIs. Editorial-curated, all four-check provenance run.

## 10. Visual elements / charts

The "Soft Modern" direction makes graphs feel approachable. Charts are SVG, hand-drawn (not a library), one purpose each.

| Chart | Where | Encoding |
|---|---|---|
| Itinerary timeline | Itinerary detail | Horizontal bar, stops as nodes, time-of-day shading (dawn/day/dusk/night), current position pin |
| Elevation profile | Itinerary detail | Filled area chart of meters above sea level over distance; "you are here" marker |
| Hours-by-day heatmap | POI detail | 7×24 grid, opaque cells = open, dimmed = closed, current hour highlighted |
| Reliability quadrant | POI detail | 2×2 grid showing four checks as filled/empty squares; smaller version on cards |
| Day-trip travel ribbon | Day-trip card | Out → visit → back, three-segment bar with minute labels |
| Weather widget | Home tab header | Single icon + temp + 3-hour forecast strip |
| Distance progress | Routes tab (active itinerary) | Slim bar at top of pinned active itinerary card |
| Today's pick selector chart | Home tab (debug/transparent) | Tiny indicator showing why this itinerary was picked (weather + time-of-day match score) |

No chart library. All inline SVG, ~50 lines each.

## 11. Bug fixes folded into the redesign

Every existing bug is addressed by the rewrite of the relevant component, but here's the explicit checklist:

| Bug | Fix |
|---|---|
| `[class.text-ink/50]` etc. | Use `[ngClass]` object syntax or static class + `:where` selectors. Component templates rewritten anyway. |
| `nextStopIndex` returns -1 when complete | Return `enrichedStops.length`; render explicit "Itinerary complete" terminal state. |
| `recenterOnUser` doesn't start watch | Auto-starts watch on first tap; subsequent taps just re-fly. |
| `requestOnce` stale errors | Clear `geo.error` on success. |
| iOS install hint overlap with nav | Hint relocated to first-run flow; in-app install affordance lives in Settings. Bottom nav respects `env(safe-area-inset-bottom)` correctly. |
| Missing-route silent fall-through | Itinerary detail surfaces "Route geometry unavailable" instead of failing silently. |
| `ngsw-config` includes `/assets/poi/**` but no images exist | New build pipeline writes images, SW now meaningful. |
| Tile pack 7-day eviction (iOS Safari) | Phase 2 Capacitor wrap eliminates this on iOS app build; PWA path warns the user proactively at day 5. |
| README claims 30+ POIs (32 actual) | README rewritten with accurate counts and new feature list. |
| Hours as free-text strings | `OpeningHours` structured + parsed; "Open now" computed. |
| No POI photos | Image pipeline + Wikimedia Commons curation. |

## 12. Bilingual content strategy

- All `name | description | address | notes` become `{ en, sr_lat, sr_cyr }`.
- App-shell strings extracted to `src/i18n/{en,sr-Latn,sr-Cyrl}.json`.
- Default language: browser locale (`navigator.language` starts with `sr` → SR; otherwise EN). Script (Latin / Cyrillic): default Latin for SR; both selectable in Settings.
- `sr_cyr` can be auto-transliterated from `sr_lat` at build time using a deterministic map (covers ~98% accurately for proper-noun-heavy travel content). Final pass is human-reviewed for Belgrade place names (Skadarlija → Скадарлија etc.).
- Phase 1 ships with EN-complete and SR-Latin-complete; SR-Cyrillic auto-transliterated and reviewed for the top 20 POIs only. Rest fallback chain: `sr_cyr → sr_lat → en`.

## 13. Image strategy

- For each POI, ship 1–3 images at 1024 px max edge, AVIF first then WebP fallback.
- Images live in `src/assets/poi/<id>/<n>.avif`, baked into the SW content cache.
- Each image carries `lqip` (8×8 base64 JPEG, ~150 bytes inline) for instant placeholder.
- Wikimedia Commons + curator's manual selection. License filter: CC0, CC BY, CC BY-SA. No NC (NonCommercial) — we may go paid in future.
- Build script `scripts/fetch-poi-images.mjs` handles download, resize, AVIF encode, LQIP generation.
- Total bundle: ~50 POIs × 2 images × 80 KB ≈ 8 MB. Acceptable; loaded lazily via SW after the tile pack.

## 14. Capacitor wrap (Phase 2)

Spec it now so the Phase 1 architecture doesn't paint us into a corner.

- Capacitor 6.x.
- Plugins: `@capacitor/geolocation`, `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/app`, `@capacitor/status-bar`.
- iOS storage: tile pack moves from IndexedDB to `Filesystem.Directory.Data` to dodge Safari's 7-day eviction; runtime detects Capacitor and routes accordingly. Web build keeps IndexedDB.
- Native splash: AVIF + dark/light variants.
- Universal links: `beograde.app/poi/<id>`, `beograde.app/itinerary/<id>` open in the app.
- App Store / Play Store metadata authored in `deploy/store/`.

Phase 1 must keep all platform-specific code behind a `platform.ts` adapter so the swap is mechanical.

## 15. Offline strategy

- PMTiles pack as today (~50–100 MB).
- Service worker prefetches: app shell, fonts, POI dataset, itinerary geometry, POI images, day-trip transit data.
- IndexedDB: prefs, saved, itinerary progress, image-cache for any non-bundled images fetched at runtime.
- Update flow: SW checks for `ngsw.json` on every load; new POI dataset arrives without re-downloading the tile pack.

## 16. Performance budgets

- Initial JS payload (gzipped) ≤ 250 KB (we'll measure; current is ~150 KB so headroom exists for the new charts/i18n).
- Time to interactive (mid-tier Android, throttled 4G) ≤ 3.5 s.
- Map ready (after first run) ≤ 1.0 s on warm load.
- Tab transitions and horizontal carousels at 60 fps on iPhone 12 / Pixel 5.

## 17. Accessibility

- All interactive elements ≥ 44 × 44 px.
- Material symbols get `aria-hidden="true"`; text label adjacent.
- Provenance chips have full text labels for screen readers (e.g. `aria-label="Wikipedia source available"`).
- Bottom-nav tabs use `<a>` with `aria-current="page"` and visible focus ring.
- Status colours never carry meaning alone — paired with icon + text.
- Reduced-motion: tab transition becomes instantaneous; disable map fly-to easing; chart entrance animations skipped.
- All charts have an `aria-label` summary (e.g. "Hours: open Tuesday through Sunday, 10 AM to 6 PM"); the heatmap has an HTML data table fallback for screen readers.

## 18. Risks & open questions

- **Capacitor + ngsw service worker interaction.** Documented patterns exist; we set `provideServiceWorker(... enabled: !isCapacitor)` and use Capacitor Filesystem instead. Verify in Phase 2.
- **Wikimedia images for niche POIs.** Smaller bars/cafés may have no usable image. Mitigation: editorial photo for top-30 POIs; remainder gets a generated category illustration (procedural SVG, in-house).
- **Transit data freshness.** Soko / Lasta schedules drift. We commit to a quarterly review; staleness chip displayed when `verifiedAt > 90 days`.
- **Cyrillic transliteration edge cases.** Foreign loanwords (e.g. café names like "Magistrala") need a manual override file. Build script flags any POI where round-trip transliteration loses information.
- **Bundle size of bilingual content.** Negligible: copy is short; gzip handles repetition.
- **Map style elevation data.** OSM contour tiles add ~10 MB to the pack; needed for elevation profile. We bake them in.

## 19. Out of scope (v1)

- User accounts / sync across devices.
- User-generated content.
- Booking / payments.
- Real-time transit (live GPS of trains/buses).
- Cycling / driving / public-transit routing inside the city.
- Augmented-reality view.
- More languages than EN + SR.
- Reviews / ratings authored by users.

## 20. Success criteria

- A first-time visitor can install, download the pack, and find an open café within 5 minutes of opening the app.
- A returning user can resume yesterday's itinerary at the next stop with one tap.
- A user planning a day trip can pick Novi Sad and see "next train 14:25, 36 min, 290 RSD" without leaving the app.
- Every POI in v1 has all four provenance checks computed; ≥80% of city POIs score ≥75/100.
- The app passes Lighthouse PWA audit (installability, offline, performance ≥ 85).
- Designer-quality screenshots are usable in store listings without retouching.

## 21. Implementation phasing

Phase 1 (this spec):
1. Design system + layout primitives (cards, chips, hero card, bottom nav, charts).
2. New data model + bilingual content + provenance pipeline.
3. New screens: Home (feed), Map, Routes, Trips, Saved, POI detail, Itinerary detail, Day-trip detail, Settings, First-run.
4. Charts (timeline, elevation, hours heatmap, reliability quadrant, travel ribbon, weather strip, distance progress).
5. Day-trip content (≈18 new POIs).
6. SR-Latin translations + SR-Cyrillic for top 20 POIs.
7. Bug fixes folded in throughout.

Phase 2 (separate spec): Capacitor wrap, App Store / Play Store submission.
Phase 3 (separate spec): More languages, more day-trips, image gallery refinements.
