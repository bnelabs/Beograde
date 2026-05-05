# Beograde build scripts

These produce the assets the runtime cannot generate itself.

| Script | Output | When to run |
|---|---|---|
| `build-tiles.sh` | `src/assets/tiles/belgrade.pmtiles` (50–100 MB) | Once, then whenever you want fresher OSM data. |
| `build-fonts.sh` | `src/assets/fonts/Noto Sans Regular/*.pbf` (~1 MB) | Once. |
| `build-itineraries.mjs` | `src/assets/itineraries/*.geojson` (real walking routes) | Whenever you change `src/app/data/itineraries.ts`. |
| `migrate-pois.mjs` | rewrites `src/assets/pois.json` to v2 schema (bilingual + structured hours + provenance) | One-shot, already run during Phase 1a; idempotent. |

## Quick start

```bash
# 1. Tile pack (the big one)
brew install osmium-tool      # or: apt install osmium-tool
brew install pmtiles          # or: download from go-pmtiles releases
# Download planetiler.jar from https://github.com/onthegomap/planetiler/releases
PLANETILER_JAR=~/Downloads/planetiler.jar npm run build:tiles

# 2. Map fonts
npm run build:fonts

# 3. Real walking routes for the curated itineraries
npm run build:itineraries
```

The `belgrade.pmtiles` file is intentionally **not** checked into git. It's
served from `/assets/tiles/belgrade.pmtiles` by nginx (see `deploy/nginx.conf`)
and downloaded by the PWA on first run into IndexedDB.

## Knobs

`build-tiles.sh` env vars:
- `BBOX` — clip area, default `20.30,44.70,20.60,44.90` (greater Belgrade)
- `MAXZOOM` — `15` keeps it under ~100 MB; `17` adds door-level detail at ~3× the size
- `SOURCE_URL` — Geofabrik PBF URL
- `PLANETILER_JAR` — path to your downloaded planetiler jar

`build-itineraries.mjs` env vars:
- `OSRM_BASE` — point at your own OSRM instance for production

## Tests

Build-script logic is tested via Node's built-in test runner:

    npm run test:scripts

The Angular unit tests are still:

    npm test -- --watch=false

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
