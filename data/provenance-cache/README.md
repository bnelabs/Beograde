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
