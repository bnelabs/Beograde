# Beograde

Offline-first Belgrade city guide. Installs to the home screen as a PWA on iOS
and Android, works fully offline once the map pack has been downloaded, uses GPS
to surface nearby places and progress through curated itineraries.

## What you get

- **Hi-res offline map** — MapLibre GL rendering a single PMTiles file
  (~50–100 MB depending on max zoom) stored in IndexedDB.
- **30+ curated POIs** with categories, addresses, hours, and tags.
- **6 hand-authored itineraries** with stop-by-stop timing and notes.
- **GPS proximity** — every POI sorts by walking distance from your current fix;
  the active itinerary highlights the next stop within 100 m.
- **Installable PWA** — Add to Home Screen on iPhone/Android, no app store, no
  developer license.

## Tech

- Angular 21 (zoneless, signals, standalone components)
- MapLibre GL + PMTiles (vector tiles, range-request friendly)
- `@angular/service-worker` for the app shell + content cache
- `idb-keyval` to persist the map pack outside the SW cache (Safari survives this)
- Tailwind v4 for styling

No backend. No API keys. No tracking.

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
**byte-range** support (`HTTP 206`) — it's already configured in the supplied
`deploy/nginx.conf`.

## Install on iPhone

1. Open the deployed URL in **Safari** (must be HTTPS).
2. Tap **Share → Add to Home Screen**.
3. Open the app from the new icon.
4. Tap **Download Belgrade pack** on first run, on Wi-Fi.
5. After that, airplane mode is fine.

iOS evicts PWA storage after roughly 7 days of non-use. If you don't open the
app for a week the map pack will need to be re-downloaded once.

## Repo layout

```
src/app/
├── core/             # geolocation, proximity, tile-pack, IndexedDB storage
├── data/             # POI/itinerary types, accessors, distance helpers
└── features/         # map, poi-list, poi-detail, itinerary-list, itinerary-detail, settings

src/assets/
├── pois.json
├── itineraries/      # GeoJSON LineString per itinerary
├── styles/           # MapLibre style for the offline pack
├── tiles/            # belgrade.pmtiles  (built by scripts/build-tiles.sh, .gitignored)
└── fonts/            # SDF glyphs        (built by scripts/build-fonts.sh, .gitignored)

scripts/              # build the offline tile pack, fonts, real walking routes
deploy/               # nginx config + Hetzner deploy guide
```

## License & data attribution

Map data © OpenStreetMap contributors, ODbL.

