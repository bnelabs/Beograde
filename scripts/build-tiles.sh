#!/usr/bin/env bash
# Build the offline Belgrade vector tile pack as a single PMTiles file.
#
# Output: src/assets/tiles/belgrade.pmtiles  (~50–100 MB depending on maxzoom)
#
# Requirements (one-time install on your laptop or build server):
#   - Java 17+              (for planetiler)
#   - planetiler.jar        https://github.com/onthegomap/planetiler/releases
#   - osmium-tool           apt: `sudo apt install osmium-tool`
#   - pmtiles CLI           https://github.com/protomaps/go-pmtiles/releases
#
# Bounding box used: 20.30,44.70,20.60,44.90 (≈ greater Belgrade)
# Adjust BBOX and MAXZOOM below to trade detail for size.
set -euo pipefail

WORK="${WORK:-./.tilebuild}"
OUT="${OUT:-src/assets/tiles/belgrade.pmtiles}"
BBOX="${BBOX:-20.30,44.70,20.60,44.90}"
MAXZOOM="${MAXZOOM:-15}"
SOURCE_URL="${SOURCE_URL:-https://download.geofabrik.de/europe/serbia-latest.osm.pbf}"
PLANETILER_JAR="${PLANETILER_JAR:-planetiler.jar}"

mkdir -p "$WORK" "$(dirname "$OUT")"

if [[ ! -f "$WORK/serbia-latest.osm.pbf" ]]; then
  echo "→ Downloading Serbia OSM extract…"
  curl -L -o "$WORK/serbia-latest.osm.pbf" "$SOURCE_URL"
fi

echo "→ Clipping to Belgrade bbox $BBOX…"
osmium extract -b "$BBOX" "$WORK/serbia-latest.osm.pbf" \
  -o "$WORK/belgrade.osm.pbf" --overwrite

echo "→ Running planetiler (maxzoom=$MAXZOOM)…"
java -Xmx4g -jar "$PLANETILER_JAR" \
  --osm-path="$WORK/belgrade.osm.pbf" \
  --output="$WORK/belgrade.mbtiles" \
  --maxzoom="$MAXZOOM" \
  --force

echo "→ Converting MBTiles → PMTiles…"
pmtiles convert "$WORK/belgrade.mbtiles" "$OUT" --force

SIZE_MB=$(du -m "$OUT" | cut -f1)
echo "✔ Wrote $OUT (${SIZE_MB} MB)"
echo "  Serve with byte-range support (see deploy/nginx.conf)."
