# Geoapify enrichment cache

Per-POI structured metadata harvested from Geoapify's Place Details API
(which in turn surfaces OSM/Wikidata tags). One file per POI, keyed by id.

The runtime app never talks to Geoapify. The build pipeline reads from
this cache and merges `goodToKnow` into `pois.compiled.json`. That keeps
the app offline-first.

## Refresh workflow

```
export GEOAPIFY_API_KEY=<your-key>
npm run build:geoapify          # fetches new + stale; ~50 API calls one-time
npm run build:content           # re-compiles pois.compiled.json with the new chips
```

By default the script skips POIs that already have a cache file. Pass
`--force` to refetch all, or `--id=<poi-id>` to refresh a single one.

## File shape

```json
{
  "fetchedAt": "2026-05-14",
  "matched": { "name": "...", "lat": 44.8, "lng": 20.4, "distanceM": 12 },
  "place_id": "5180...",
  "goodToKnow": {
    "wheelchair": "yes",
    "wifi": "free",
    "heritage": "national",
    "wikidata": "Q123",
    "website": "https://..."
  }
}
```

A POI with no confident match (>250 m drift or no name overlap) is
recorded as `{ "fetchedAt": "...", "matched": null }` so we don't keep
retrying it on every run. Delete that file to retry.
