# Beograde Redesign — Design Spec

**Date:** 2026-05-04
**Status:** Draft, pending user review
**Owner:** Rahat

## 1. Goal

Turn the existing Belgrade PWA into a polished, mobile-first city guide that:

- Looks and feels like a designed product, not a prototype.
- Trusts user with **defensible** POI data (no fake-review surface, transparent provenance).
- Reaches stores via Capacitor without throwing away the Angular work.
- Covers Belgrade *and* nearby attractions reachable by train or public transport.
- Visualises itineraries with charts and graphs, not just lists.
- Stays offline-first — **everything required for use works offline.** Network is for *enhancements* (weather, live install prompt, future updates) that gracefully no-op when missing. Transit "next departure" data is baked-in static; not live.

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
  hours?: OpeningHours;          // OSM opening_hours grammar, parsed via library
  // Pricing: RSD primary, EUR derived from a stored snapshot rate
  pricing?: { tier: '€' | '€€' | '€€€'; rsd?: { min: number; max: number } };

  tags: string[];
  images: ImageAsset[];

  // Transit (only present when region !== 'city')
  transit?: TransitInfo[];

  // PROVENANCE
  verifiedAt: string;            // ISO date
  sources: SourceRef[];          // see below
  reliability: ReliabilityScore; // see below
  editorialConfidence: 'high' | 'medium' | 'low';
};

type SourceRef =
  | { kind: 'wikipedia';        url: string; lang: 'en' | 'sr' }
  | { kind: 'osm';              ref: string }                      // e.g. way/123
  | { kind: 'official';         url: string; org: string }         // tob.rs, tourism board
  | { kind: 'google-places';    placeId: string; reviewCount: number; rating: number; checkedAt: string }
  | { kind: 'tripadvisor';      url: string; reviewCount: number; rating: number; checkedAt: string };

type ReliabilityScore = {
  // 0..100, computed but used as TRANSPARENCY, never as a publish gate.
  // A POI with score 25 can still be published — the chips show the user
  // exactly what's known and unknown, and editorialConfidence carries the
  // weight that crowd-sourced volume can't carry for niche spots.
  score: number;
  checks: {
    wikipedia: boolean;        // 25 pts
    osm: boolean;              // 25 pts (full tags: name, address, hours)
    official: boolean;         // 25 pts (Belgrade Tourism Org or city listing)
    crowdsourced: boolean;     // 25 pts iff google ≥500 OR tripadvisor ≥200
  };
};

// Publish rule (enforced in build script):
//   POI is publishable iff
//     (wikipedia || osm || official)  ||  editorialConfidence === 'high'
// Niche kafanas, bars, and viewpoints often score 0/100 on automated checks
// but are excellent picks. 'high' editorial confidence carries them.

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
  // OSM opening_hours grammar — the canonical truth. Handles holidays,
  // seasons, overnight, "by appointment", exceptions.
  // Examples that must work:
  //   "Tu-Su 10:00-18:00; Th 10:00-20:00"
  //   "Mo-Fr 08:00-12:00,14:00-18:00; PH closed"
  //   "Apr-Oct: Mo-Su 09:00-22:00; Nov-Mar: Mo-Su 10:00-18:00"
  //   "Th-Sa 23:00-05:00"   (overnight)
  //   "by appointment"
  raw: string;

  // Parsed at runtime via the opening_hours.js library (~30 KB gz).
  // We do NOT pre-flatten to weekday periods — that lossy step is what
  // breaks holidays/seasons. A wrapper service handles "open now":
  //
  //   isOpenNow(raw) -> { state: 'open' | 'closed' | 'unknown', until?: Date }
  //
  // 'unknown' is returned when:
  //   - the grammar is unparseable, OR
  //   - the date falls inside a Public Holiday rule we can't resolve
  //
  // UI rule: only render an "Open now" badge when state === 'open'.
  // 'closed' renders "Closed · opens Tue 10:00". 'unknown' renders no badge —
  // never wrong info. The conservative default protects trust.

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
  durationMinutes: number;        // typical, end-to-end

  // Static departure table — local time HH:MM, 24h, for the OUT-bound leg.
  // Baked-in offline; refreshed quarterly. "Next departure" computed
  // client-side from the user's current local time:
  //   const next = departures.find(t => t > now) ?? departures[0]+1day
  // Schedule is for the operator's typical working day (Mo-Fr); weekend
  // variants live in `weekendDepartures` if non-trivial.
  departures: string[];           // e.g. ["06:25","09:25","14:25","17:25","19:25"]
  weekendDepartures?: string[];

  // Validity window for seasonal schedules (Oct→May vs May→Oct).
  validity: { from: string; to: string }; // ISO dates

  // Return-leg last service so we can show "last train back" warning.
  lastReturnLocal?: string;       // HH:MM in destination's timezone (same as origin for v1)

  fareRSD: { min: number; max: number };
  bookingUrl?: string;
  notes?: { en: string; sr_lat: string; sr_cyr: string };
};

// POI carries one or more TransitInfo entries via the optional `transit`
// field on POI (see above). City POIs have it absent or empty.
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

### Belgrade-specific identity layer

Soft Modern is the chassis. On top, a layer of Belgrade-specific motifs prevents the app from looking interchangeable with every other warm-gradient travel app:

- **River-blue accent** (`--river: #6BA3CC`, deeper than `--map-water`) — used for the elevation chart fill, river-route itinerary lines, the Sava/Danube ribbon under page headers, and the empty-state illustrations.
- **Sandstone fortress accent** (`--fortress: #C7A879`) — Kalemegdan walls; used for itinerary "old-town" chips, fortress-themed empty states, and the Routes-tab accent.
- **Tram red** (`--transit-red: #C8302C`, drawn from GSP livery) — *only* used for transit elements (Trips tab accent, transit cards, station markers, "next departure" chips). Reserving it for transit means the user learns the colour means "this is how you get there."
- **Concrete grey** (`--concrete: #8A8579`, with a subtle noisy texture) — applied as background to day-trip cards and brutalist UI moments (Beton Hala, New Belgrade, Drugstore). One of the few times we break the warm palette — and the contrast does the work.
- **Two-rivers mark** — the app's logo is the Sava/Danube confluence reduced to two interlocking arcs, also used at 4% opacity as an ambient watermark on empty states and as a 1-line skeleton on the splash screen.
- **Map-style refresh** — the existing offline tile pack style is updated to make the rivers the visual hero (slightly thicker outline, slightly more saturated `#A4C8E0`, contour lines re-coloured to soft sandstone). Tram and trolleybus lines (where present in OSM) drawn in `--transit-red` at z>=14.
- **Itinerary line styling** depends on theme: river-routes in solid `--river`, old-town routes in dashed `--fortress`, modern-Belgrade routes in solid `--concrete`. The route's *colour* tells the user what kind of walk this is before they read the title.

This layer is documented in `src/styles/belgrade-tokens.css`. The Soft Modern base lives in `src/styles/soft-modern.css`. Components compose both.

## 8. POI accuracy / provenance system

### Design principle

The reliability score is **transparency, not a gate.** The four checks below are easy to game in opposite directions: a globally famous landmark trivially scores 100 even if the actual experience is mediocre, while a beloved hidden kafana with no Wikipedia article and 200 reviews scores 50 even though it's an excellent pick. So we publish based on editorial judgement, surface the checks as honest "what we know" signals, and never use the score to hide POIs from users.

### The four automated checks

A POI's `reliability.score` is determined by how many of these are true (25 pts each):

1. **Wikipedia** — has a non-stub article in EN or SR.
2. **OSM** — exists with full tags (name, address, opening_hours).
3. **Official** — listed by a recognised authority (Belgrade Tourism Organisation `tob.rs`, City of Belgrade, ministry).
4. **Crowdsourced (volume threshold)** — Google Places review count ≥ 500 *or* TripAdvisor review count ≥ 200. Volume threshold neutralises buy-a-review noise; we never display individual review text or counts below the threshold.

We never display review *text*, never display a star rating below threshold, never call live APIs at runtime — provenance is computed offline at build time.

### The fifth signal: editorial confidence

`editorialConfidence: 'high' | 'medium' | 'low'` is set by the curator in source data. It captures whether the editor has personally vetted the place (high), is going on a trusted recommendation (medium), or has sourced from a single internet listing (low).

### Publish rule

```
publishable  ⇔  (wikipedia ∨ osm ∨ official)  ∨  editorialConfidence === 'high'
```

A POI with score 0/100 but `editorialConfidence: 'high'` is published — the UI shows a "Curated by editor" pill where the four-check chips would be, with the editor's note as tooltip. A POI with `score: 75` and `editorialConfidence: 'low'` is also published — chips speak for themselves.

### UI: provenance chips

Every POI card (list or detail) shows the chips it qualifies for:

- `WIKI ✓` — link opens Wikipedia article in browser.
- `OSM ✓` — link to OSM way/relation.
- `OFFICIAL ✓` — link to the official source.
- `8.4K REV` — only shown when threshold met; never a star rating, just a volume signal.
- `EDITOR'S PICK` — shown when `editorialConfidence: 'high'` AND fewer than two automated checks pass (so it doesn't crowd the chip strip on otherwise-well-documented POIs).

Last verified date is shown discreetly on detail view: `Verified 4 May 2026`. POIs with `verifiedAt` older than 180 days display a soft warning chip.

### Authoring tooling

A new build-time script `scripts/build-provenance.mjs`:

- Reads `pois.json` source.
- For each POI, checks Wikipedia API (no quota) + OSM Overpass (no quota); reads cached Google Places JSON if present in `data/provenance-cache/<id>.json` (manual paste, no live calls — quarterly audit).
- Emits enriched `pois.compiled.json` consumed at runtime.
- Validates publish rule; fails the build if a POI is not publishable.

## 9. Regional / day-trip system

POIs with `region: 'day-trip'` carry one or more `TransitInfo` entries via the optional `transit` field on POI. The **Trips** tab groups them by `mode`:

- **Soko fast train** — Belgrade ↔ Novi Sad (36 min).
- **Srbija Voz regional** — slower trains (e.g. to Smederevo).
- **BG VOZ** — suburban (Pančevo etc.).
- **Lasta intercity bus** — Topola, Avala, Kosmaj.
- **GSP city bus** — Avala (bus 401 from Voždovac).

Each card shows: cover image, name, mode pill, "next departure HH:MM · X min · ~Y RSD" (computed offline from `departures[]`), "last return HH:MM" if relevant. Tapping opens a Day-trip detail with a **transit card** at the very top above the POI body, showing the full `departures[]` table.

### Initial day-trip POI list (Phase 1b content)

- **Inside ~30 km:** Avala (existing), Smederevo Fortress, Pančevo (centre), Kosmaj.
- **30–100 km:** Novi Sad (centre), Petrovaradin Fortress, Sremski Karlovci, Topola/Oplenac (Karađorđević mausoleum), Fruška Gora monasteries (Krušedol, Hopovo), Viminacium Roman site.

≈18 new POIs. Editorial-curated; provenance pipeline applies; `editorialConfidence` carries spots that have neither Wikipedia nor official listings (small monasteries, viewpoints).

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
| Hours as free-text strings | `OpeningHours.raw` carries OSM grammar; parsed at runtime via `opening_hours.js`; "Open now" returns `open ∣ closed ∣ unknown`, never wrong. |
| No POI photos | Image pipeline + Wikimedia Commons curation. |

## 12. Bilingual content strategy

- All `name | description | address | notes` become `{ en, sr_lat, sr_cyr }`.
- App-shell strings extracted to `src/i18n/{en,sr-Latn,sr-Cyrl}.json`.
- Default language: browser locale (`navigator.language` starts with `sr` → SR; otherwise EN). Script (Latin / Cyrillic): default Latin for SR; both selectable in Settings.

### Cyrillic coverage strategy

Partial Cyrillic feels broken — a user who selects Cyrillic should see Cyrillic everywhere, not Cyrillic for 20 POIs and Latin for the rest. So:

- **Auto-transliterate every string** from `sr_lat` to `sr_cyr` at build time using a deterministic Latin→Cyrillic table (Љ/љ, Њ/њ, Џ/џ, Ђ/ђ, Ћ/ћ, Ј/ј digraph rules etc.).
- **Manual override file** at `src/i18n/sr-cyr-overrides.json` for foreign loanwords and proper nouns the table can't get right (café names like "Magistrala" stay Latin per Serbian convention; foreign brand names; trademarked spellings).
- **Build-time QA flag**: `scripts/build-i18n.mjs` round-trips `sr_lat → sr_cyr → sr_lat` and warns on any string that doesn't round-trip cleanly. Curator triages each warning into either a fix to the source or a manual override entry.
- **No fallback chain**: every string has all three forms by build time. If `sr_cyr` is selected and a string is missing, the build fails — there is no runtime fallback to Latin.
- Phase 1a ships EN + SR-Latin only (Cyrillic toggle hidden). Phase 1b enables Cyrillic when the override file is reviewed and QA round-trip is clean.

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
- Service worker prefetches: app shell, fonts, POI dataset, itinerary geometry, POI images, **transit-departure tables** (baked into the POI dataset under `transit[].departures`).
- IndexedDB: prefs, saved, itinerary progress, image-cache for any non-bundled images fetched at runtime.
- Update flow: SW checks for `ngsw.json` on every load; new POI dataset arrives without re-downloading the tile pack.

### Online-only enhancements (graceful no-op offline)

These features are *additive*. Each must render a clean, intentional empty state when network is unavailable so the user never sees a half-broken UI:

| Feature | Where | Source | Offline behaviour |
|---|---|---|---|
| Weather | Home tab header | open-meteo.com (no API key, free, CORS-friendly) | Show placeholder strip "Weather offline · open when online" — no error, no broken icon. Cached last fix shown if < 6 h old. |
| Live install prompt | Settings | `beforeinstallprompt` | Already gracefully no-ops. |
| Future spec updates | Service worker | Same-origin `ngsw.json` | Standard SW behaviour; offline keeps the cached version. |

The spec's offline-first promise is therefore precise: **all decision-relevant content (POIs, hours, transit departures, itineraries, map) works fully offline.** Weather is a flourish, never decision-relevant — a user can plan a Belgrade day without knowing it's 22°.

### Transit "next departure" — how it works offline

Each `TransitInfo` carries a static `departures: string[]`. The runtime computes the next departure as:

```ts
function nextDeparture(t: TransitInfo, now: Date): { time: string; minutesAway: number } {
  const today = isWeekend(now) && t.weekendDepartures ? t.weekendDepartures : t.departures;
  const nowHHMM = format(now, 'HH:mm');
  const next = today.find(d => d > nowHHMM);
  if (next) return { time: next, minutesAway: diffMinutes(nowHHMM, next) };
  // Roll over to first departure tomorrow
  const tomorrow = isWeekend(addDays(now, 1)) && t.weekendDepartures ? t.weekendDepartures : t.departures;
  return { time: tomorrow[0], minutesAway: diffMinutes(nowHHMM, tomorrow[0]) + 1440 };
}
```

Schedule freshness: the dataset header carries `transitVerifiedAt`. Anything older than 90 days renders a soft `Schedule may have changed — check operator` chip on transit cards. Quarterly review is a documented operations task.

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
- **Transit schedule drift.** Soko / Lasta departure times change seasonally. Mitigation: `transitVerifiedAt` field; staleness chip after 90 days; documented quarterly review.
- **`opening_hours.js` bundle weight.** ~30 KB gzipped. Acceptable; loaded only when a POI detail with hours is viewed (lazy chunk).
- **Bundle size of bilingual content.** Negligible: copy is short; gzip handles repetition.
- **Map style elevation data.** OSM contour tiles add ~10 MB to the pack; needed for elevation profile. We bake them in.
- **Editorial confidence subjectivity.** A 'high' rating from one curator may be optimistic. Mitigation: add a `confidenceSetBy` field for accountability; periodic peer review of every 'high' rating with no other automated checks.
- **Static departures vs reality.** Operator changes a 14:25 train to 14:30; the app shows the wrong time until the next dataset rolls out. Mitigation: visible `Schedule may have changed — check operator` chip, `bookingUrl` deeplink to operator site.

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
- A user planning a day trip can pick Novi Sad and see "next departure 14:25 (later: 17:25, 19:25) · 36 min · ~290 RSD" computed entirely offline from the baked-in schedule.
- Every POI in v1 has the four automated checks computed *and* an `editorialConfidence` flag set by the curator. ≥60% of city POIs score ≥75/100; the rest are still publishable when carried by editorial confidence (with the chip strip telling that story honestly).
- "Open now" is correct *or* unknown — never wrong. Conservatively: when the OSM hours grammar can't be parsed unambiguously, no badge.
- The app is fully usable in airplane mode after the pack is downloaded; weather is the only feature that no-ops offline, and it does so with a tidy placeholder.
- The app passes Lighthouse PWA audit (installability, offline, performance ≥ 85).
- Designer-quality screenshots are usable in store listings without retouching.

## 21. Implementation phasing

Phase 1 was too large in the first draft. Splitting:

### Phase 1a — Ship-viable redesign (this is the MVP)

**Goal:** a redesigned app, in users' hands, working offline, on the existing 32 city POIs, with the design language locked and the bug list cleared.

1. Design system primitives — Soft Modern + Belgrade identity layer (tokens, cards, chips, hero card, bottom nav, three core chart components).
2. POI data model migration — bilingual `{ en, sr_lat }` fields (Cyrillic toggle hidden until Phase 1b), `OpeningHours` via `opening_hours.js`, `editorialConfidence` flag, `images` with LQIP, manual `sources` entries (no automated build script yet).
3. Five tabs implemented: Home (feed of *existing* itineraries + nearest POIs + open-now strip), Map (polished current behaviour), Routes, Trips (placeholder empty state — real content in 1b), Saved.
4. Three core charts: itinerary timeline, hours-by-day heatmap, distance progress.
5. POI detail rewrite with provenance chip strip (chips work from manually entered `sources`).
6. Itinerary progress persistence to IndexedDB.
7. Bug-fix sweep folded into the rewrites: ngClass migration, recenter-with-watch, request-once error reset, complete-itinerary state, missing-route surface.
8. EN-complete content; SR-Latin partial (top-10 POIs and all UI strings).
9. README + scripts updated to match new state.

### Phase 1b — Content + reach + delight

**Goal:** the app earns its "Belgrade and around" tagline; Cyrillic ships clean; the editorial flourishes land.

1. `scripts/build-provenance.mjs` automates the four-check pipeline for every POI.
2. `scripts/fetch-poi-images.mjs` automates Wikimedia + curated AVIF + LQIP generation.
3. ≈18 new day-trip POIs with `transit?: TransitInfo[]`; Trips tab gets real content; Day-trip detail renders.
4. Remaining five charts: elevation profile, reliability quadrant, day-trip travel ribbon, weather strip (online-only enhancement), Today's pick selector indicator.
5. SR-Latin completed for all POIs.
6. SR-Cyrillic enabled: auto-transliteration build script + manual override file + QA round-trip.
7. Editorial story cards on Home (3–5 long-form sections).
8. First-run flow polish (language pick, GPS prompt, pack download orchestration).
9. Map style refresh — rivers-as-hero, transit lines in `--transit-red`.

### Phase 2

Capacitor wrap, App Store / Play Store submission. Separate spec.

### Phase 3

More languages, more day-trips, image gallery refinements, optional logged-in sync. Separate spec.
