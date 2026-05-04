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
