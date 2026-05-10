---
id: beograde-redesign-phase-1b-2
title: Beograde redesign — Phase 1b.2 (image pipeline + day-trip POIs)
status: draft
date: 2026-05-10
predecessors:
  - docs/superpowers/specs/2026-05-04-beograde-redesign-design.md
  - docs/superpowers/plans/2026-05-04-beograde-redesign-phase-1b-1.md
---

# Phase 1b.2 — image pipeline + day-trip POIs

## Goal

Finish the **content side** of the redesign so subsequent UI slices have all
their inputs:

1. A reproducible **image pipeline** that turns curated Wikimedia Commons
   sources into AVIF assets + LQIP and merges `ImageAsset[]` into
   `pois.compiled.json`.
2. **18 new day-trip POIs** added to `pois.json` at the same content bar 1b.1
   enforces (bilingual coverage, structured hours, provenance, transit data).

This slice deliberately stays in the **toolchain + content** lane; no new UI
surface ships. Trips/day-trip detail screens, charts, and editorial cards
remain deferred to Phase 1b.3+.

## Shape of the work (honest sizing)

| Half | Estimated commits | Risk |
|---|---|---|
| Image pipeline (script, tests, CLI, asset wiring) | 5–7 | Low — mirrors `build-provenance` precedent. |
| 18 day-trip POIs (research, write, verify, transit) | 8–12 | Higher — research-heavy; transit timetables and hours are perishable. |
| Run pipeline on existing 32 city POIs (validation pass) | 1–2 | Low — exercises the pipeline on real data before it meets new POIs. |

**The curation half is bigger than the pipeline half.** The implementation plan
must reflect that — short steps for code, longer steps for content with
explicit verification gates.

## Non-goals (deferred to 1b.3+)

- Trips tab UI / day-trip detail screen / itinerary cards for day-trips.
- Five remaining charts (transit timeline, fare distribution, etc.).
- Editorial story cards.
- First-run onboarding polish, map style refresh.
- Any UI change driven by the new images. The runtime today renders zero
  images (all 32 POIs ship `images: []`); the UI consumer gets wired in 1b.3.

---

## Decision 1 — Image pipeline does NOT run on `prebuild`

`build-provenance` and `build-i18n` run on every `prebuild`. The image
pipeline does not. Rationale:

- It hits Wikimedia Commons (and possibly Wikipedia REST for licensing).
  CI/local builds must not be hostage to Wikimedia uptime.
- AVIF transcoding is CPU-heavy; running it on every `ng build` is wasteful.
- Outputs are **committed** (see Decision 2), so the production build pipeline
  needs no fresh fetch.

It runs **manually**, idempotent, like `build:tiles`:

```bash
npm run build:images          # skip-if-fresh, regenerate stale entries
npm run build:images -- --force   # full rebuild
```

`scripts/README.md` "Content pipelines" table grows a third row, but the
script is **not** chained into `build:content`. Document this divergence
explicitly so the pattern is intentional, not accidental.

## Decision 2 — Commit the AVIFs

Default: AVIFs land in `src/assets/poi/<id>/*.avif` and **are committed**.

- Precedent favors committing generated content assets:
  `src/assets/pois.compiled.json`, `src/i18n/sr-Cyrl.json`, and
  `src/assets/itineraries/*.geojson` are all generated and tracked.
  The single exception is `belgrade.pmtiles` (50–100 MB).
- Expected size: ~50 POIs × 3–4 sizes × ~30–80 KB AVIF ≈ **6–15 MB** total.
- The implementation plan **must measure on 3–5 POIs first** to confirm the
  estimate before bulk-running the pipeline.
- **Threshold**: if total `src/assets/poi/` exceeds **50 MB**, switch to git
  LFS or move AVIFs to nginx-served paths like `belgrade.pmtiles`. Until then,
  commit them.

## Decision 3 — LQIP is JPEG (matches the existing type)

`src/app/data/types.ts:30` documents `lqip` as a "Base64-inlined 8×8 JPEG,
~150 bytes". The pipeline produces JPEG LQIPs to match — `sharp` can do this
in one chain. We do **not** silently drift the type to AVIF LQIP; the runtime
and the type file are the source of truth.

```js
// LQIP recipe (in core script)
sharp(input).resize(8, 8, { fit: 'cover' }).jpeg({ quality: 30 }).toBuffer()
  .then((buf) => `data:image/jpeg;base64,${buf.toString('base64')}`);
```

## Decision 4 — Two tiers of image coverage, explicit

**Tier A — curated**: a file at `data/poi-images/<id>.json` exists, listing
one or more Wikimedia Commons file URLs with attribution + license. The
pipeline:

1. Fetches the Commons file (best Commons resolution, capped at 2400px wide).
2. Generates AVIF at responsive widths: `[640, 1024, 1600]`.
3. Generates a JPEG LQIP per source image.
4. Writes to `src/assets/poi/<id>/<slug>-{640,1024,1600}.avif`.
5. Emits `ImageAsset[]` into `pois.compiled.json` with `src` pointing at the
   1024 variant; `width`/`height` reflect the **1024 variant** (canonical
   render target — runtime layout uses these for aspect-ratio reservation);
   `lqip` is the data-URI; `credit`/`license` are copied verbatim from the
   curator file; `source` is the Commons file URL.

**Tier B — no curated source**: no file at `data/poi-images/<id>.json`. The
POI ships `images: []` in `pois.compiled.json`. The runtime UI (in 1b.3)
must render a fallback. Cafés and restaurants often fall here because Commons
coverage is thin for non-landmark venues — the day-trip POI selection rubric
in §"Day-trip POI rubric" biases toward Commons-photographable subjects so
this isn't the common case for day-trips.

**Curator file shape** (`data/poi-images/<id>.json`):

```json
{
  "images": [
    {
      "commonsFile": "File:Tara_National_Park_Tara_View.jpg",
      "credit": "Yosemiti, CC BY-SA 3.0, via Wikimedia Commons",
      "license": "CC BY-SA 3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Tara_National_Park_Tara_View.jpg"
    }
  ],
  "fetchedAt": "2026-05-10"
}
```

`fetchedAt` lets the pipeline skip re-fetch unless the curator file changes.
Idempotency rule: if every output AVIF for a POI exists and the curator file's
mtime is older than the oldest output's mtime, skip.

## Decision 5 — Day-trip POI rubric (spec); enumeration (plan)

This spec **does not** list the 18 specific POIs. The implementation plan does
that picking. The spec defines the rubric so the plan's curation task has a
target.

**Selection rubric (must satisfy):**

- **Category mix**, target distribution: 8 sights/parks, 4 museums,
  3 cuisine/cafe, 3 viewpoints. Adjust ±1 per category to fit reality.
- **Distance band**: ≤ 120 km from Belgrade city centre by transit, OR
  ≤ 90 minutes one-way by the listed transit mode. Both.
- **Transit-mode coverage**: at least one POI per transit mode listed in
  `TransitInfo` (`soko`, `regional-train`, `suburban-train`, `intercity-bus`,
  `city-bus`). The Soko high-speed rail line is the obvious anchor for
  Novi Sad / Subotica reachability.
- **Commons-image preference**: prefer subjects with at least one quality
  Wikimedia Commons photograph available. POIs without Commons coverage may
  ship Tier B (`images: []`) but should be a small minority.
- **Provenance verifiability**: each POI must satisfy the same publishable
  gate as 1b.1 — a Wikipedia article (`wikipediaTitle`) and/or OSM ref
  (`osmRef`) sufficient for `editorialConfidence: 'high' | 'medium'`.
- **Hours**: real OSM `opening_hours` grammar; cross-check against the
  official site or OSM. POIs with unverifiable hours either get
  `editorialConfidence: 'low'` (which fails the publishable gate — exclude)
  or omit `hours`.
- **Bilingual content bar**: `en` + `sr_lat` written by hand; `sr_cyr` is
  auto-filled by `build-i18n` round-trip with overrides as needed (same
  process as 1b.1).

## Decision 6 — Transit-data curation policy

Day-trip POIs differ from city POIs because each carries `transit:
TransitInfo[]`. Without an explicit policy this data rots within months.

**Source of truth**: official operator timetables.

| Mode | Source | Validity window |
|---|---|---|
| `soko` | https://www.srbvoz.rs (Soko schedule) | 6 months |
| `regional-train`, `suburban-train` | https://www.srbvoz.rs (BG Voz, Šinobus) | 6 months |
| `intercity-bus` | Operator site (Lasta, etc.) cited in `bookingUrl` | 3 months |
| `city-bus` | https://www.gsp.rs | 3 months |

Each `TransitInfo.validity` is filled with `from = capture date`, `to =
capture date + validity window`. The implementation plan adds a curation
step that records the source URL and capture date for each entry.

**Re-verification cadence** (deferred work, documented here): a future
maintenance task re-checks every `TransitInfo` whose `validity.to` is past;
this is **not** a Phase 1b.2 deliverable.

**Pragmatic notes** (advisor flagged, not blocking):

- `fareRSD: { min, max }` will often degenerate to `min === max` for BG Voz
  point-to-point routes. Acceptable; no schema change.
- `bookingUrl` is `?` (optional). Soko / Lasta intercity → present.
  City buses → omit.

## Decision 7 — Ordering inside the slice

The implementation plan **must** order tasks like this:

1. **Pipeline first**, TDD, mirroring 1b.1 conventions:
   pure core → unit tests → CLI → README → npm script.
2. **Validate against existing 32 city POIs**: pick 3–5 with strong Commons
   coverage (Kalemegdan, Saint Sava, Skadarlija are obvious), write
   `data/poi-images/<id>.json` for each, run the pipeline, eyeball the AVIFs
   and the merged `pois.compiled.json`. Confirm size estimate.
3. **Backfill the remaining city POIs** that have Commons coverage. Skip
   without ceremony for the ones that don't.
4. **Then** curate the 18 day-trip POIs against the validated pipeline.

Curating 18 new POIs against an unproven pipeline is the wrong order — any
pipeline bug compounds across new content.

---

## Architecture / file plan

### New files

```
scripts/build-images.mjs              # CLI wrapper (thin, like build-provenance.mjs)
scripts/lib/build-images-core.mjs     # pure async function, fetchFn-injected
scripts/lib/build-images-core.test.mjs
data/poi-images/README.md             # explains curator-file shape
data/poi-images/<id>.json             # one per curated POI (Tier A)
src/assets/poi/<id>/<slug>-{640,1024,1600}.avif    # generated, committed
docs/superpowers/specs/2026-05-10-beograde-redesign-phase-1b-2-design.md  # this file
```

### Modified files

- `src/assets/pois.json` — append 18 day-trip POI entries.
- `src/assets/pois.compiled.json` — regenerated; gains `ImageAsset[]` for
  Tier-A POIs, gains 18 new entries for day-trips.
- `package.json` — add `build:images` script. Do **not** add to
  `build:content`.
- `scripts/README.md` — third "Content pipelines" row + a note that
  `build:images` is intentionally manual.
- `data/poi-images/.gitkeep` and possibly `.gitignore` rules (none expected
  — AVIFs are committed).

`build-provenance-core.mjs` is **not** modified. Image-source provenance
(curator file's `fetchedAt`, Commons URL) lives entirely in `build-images`,
which owns its merge into `pois.compiled.json`. Keeping the two pipelines
decoupled is intentional: the provenance pipeline is about *editorial*
sourcing (Wikipedia/OSM article exists), the image pipeline is about
*media* sourcing (Commons file licensed correctly). Different gates,
different cadences.

### Out of scope (do not touch in this slice)

- `src/app/**` UI/components/templates — runtime stays unchanged.
- `ngsw-config.json` — `/assets/poi/**` is already pre-allocated.
- `build-provenance.mjs` runtime behavior over Wikipedia/OSM — only the
  curator-file integration touches it, if at all.

## Components

```
build-images-core.mjs
├─ fetchCommonsFile(url, fetchFn)          # → Buffer + dimensions
├─ transcodeAvif(buffer, widths)           # → { 640: Buffer, 1024: ..., 1600: ... }
├─ jpegLqip(buffer)                         # → "data:image/jpeg;base64,..."
├─ writeAvifSet(poiId, slug, transcoded)    # → file paths
├─ buildImageAssetEntries(curator, files)   # → ImageAsset[]
└─ runBuildImages({ poisPath, cacheDir, outDir, compiledPath, fetchFn, force })
     # orchestrates: read pois.compiled.json, walk curator files,
     # skip-if-fresh, write AVIFs, merge ImageAsset[] into compiled.
```

Pure functions are unit-testable with stub buffers + a stub `fetchFn`. The
orchestrator is integration-tested with a tmpdir.

## Data flow

```
  pois.json   ──► build-provenance ──► pois.compiled.json (no images)
                                                   │
  data/poi-images/<id>.json ───┐                   ▼
  Wikimedia Commons (live) ────┴── build-images ──► pois.compiled.json (+images)
                                          │
                                          └──► src/assets/poi/<id>/*.avif (committed)
```

`build-images` reads `pois.compiled.json` (not `pois.json`) so provenance
checks have already run. It writes `pois.compiled.json` back atomically with
`ImageAsset[]` filled in.

This means the runtime ordering becomes:

```
prebuild (auto):  build:provenance  →  build:i18n
manual (when curating):  build:content  →  build:images
```

`build:images` does **not** call `build-provenance` internally — they stay
decoupled (see "Modified files" above). Operator workflow when adding a new
POI + image set: edit `pois.json` → `npm run build:content` → edit
`data/poi-images/<id>.json` → `npm run build:images`. The README documents
this sequence.

## Error handling

- Wikimedia fetch failure → fail loudly, exit 1, do not silently degrade.
  (Operator can re-run later. No partial AVIF writes.)
- Curator file malformed → fail loudly with the file path, do not skip.
- Output dir not writable → fail. No fallbacks.
- AVIF encode failure (sharp throws) → fail with the POI id and source URL.
- Network unavailable + outputs already fresh → succeed (skip path).

## Testing

Mirror 1b.1 patterns:

- `scripts/lib/build-images-core.test.mjs` runs under
  `npm run test:scripts`.
- Unit tests for each pure function with stub buffers + stub fetchFn.
- One integration test that drives `runBuildImages` against a tmpdir +
  fake-Commons fetchFn returning a known-shape PNG buffer; asserts
  `ImageAsset[]` shape, asserts AVIFs exist on disk, asserts LQIP starts
  with `data:image/jpeg;base64,`.
- No Angular runtime tests for this slice (no UI changes).

`sharp` is added to `devDependencies`. The CI lockfile updates accordingly.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| AVIF total > 50 MB | Measure on 3–5 POIs first (plan task). Fall back to git LFS or nginx-served only if exceeded. |
| Commons attribution drift | `credit` + `license` come from the curator file, not auto-scraped. Curators take responsibility. |
| Day-trip transit data stales | `validity` window per mode; documented re-verification cadence. |
| 18-POI curation underestimated | Plan splits curation into 3–4 sub-tasks (e.g. "first 6 POIs", "next 6", "last 6"), each with provenance + transit verification gates. |
| Pipeline bug discovered late | Order tasks so existing 32 city POIs validate the pipeline before any day-trip data is written. |

## Acceptance criteria

- `npm run test:scripts` is green.
- `npm run build:images` runs end-to-end on a clean checkout, produces
  AVIFs, and updates `pois.compiled.json` with `ImageAsset[]` for at least
  the curated subset of city POIs.
- `pois.json` contains 32 + 18 = **50 POIs**, all passing the same
  publishable gate 1b.1 enforces.
- Day-trip POIs cover all five `TransitInfo` modes at least once.
- `scripts/README.md` documents `build:images` and explicitly notes its
  divergence from the prebuild chain.
- `git ls-files src/assets/poi | wc -l` is non-zero (AVIFs committed); total
  size of `src/assets/poi/` is ≤ 50 MB.
- No runtime/UI files in `src/app/**` are modified.
