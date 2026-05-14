#!/usr/bin/env bash
# Build the offline tile pack as a single PMTiles file. Despite the filename
# `belgrade.pmtiles`, the pack must enclose every POI in src/assets/pois.compiled.json
# so day-trip destinations (Subotica, Viminacium, Banja Koviljača, etc.) render
# over the basemap rather than over blank tiles.
#
# Output: src/assets/tiles/belgrade.pmtiles  (~190 MB at maxzoom=15 for this bbox;
# lower MAXZOOM to 13 if a smaller first-download is preferred — costs street detail
# outside Belgrade)
#
# Requirements (one-time install on your laptop or build server):
#   - Java 17+              (for planetiler)
#   - planetiler.jar        https://github.com/onthegomap/planetiler/releases
#   - osmium-tool           apt: `sudo apt install osmium-tool` / `brew install osmium-tool`
#   - pmtiles CLI           https://github.com/protomaps/go-pmtiles/releases
#
# Bounding box: 19.11,44.20,21.25,46.15 — encloses all POIs (W: Banja Koviljača,
# E: Viminacium, N: Subotica, S: Oplenac) with 0.05° padding. Derived from POI
# coordinates; recompute when adding POIs that fall outside this box.
#
# Adjust BBOX and MAXZOOM below to trade detail for size.
set -euo pipefail

WORK="${WORK:-./.tilebuild}"
OUT="${OUT:-src/assets/tiles/belgrade.pmtiles}"
BBOX="${BBOX:-19.11,44.20,21.25,46.15}"
MAXZOOM="${MAXZOOM:-15}"
SOURCE_URL="${SOURCE_URL:-https://download.geofabrik.de/europe/serbia-latest.osm.pbf}"
PLANETILER_JAR="${PLANETILER_JAR:-planetiler.jar}"

mkdir -p "$WORK" "$(dirname "$OUT")"

if [[ ! -f "$WORK/serbia-latest.osm.pbf" ]]; then
  echo "→ Downloading Serbia OSM extract…"
  curl -L -o "$WORK/serbia-latest.osm.pbf" "$SOURCE_URL"
fi

echo "→ Clipping to Belgrade bbox ${BBOX}…"
osmium extract -b "$BBOX" "$WORK/serbia-latest.osm.pbf" \
  -o "$WORK/belgrade.osm.pbf" --overwrite

echo "→ Running planetiler (maxzoom=$MAXZOOM)…"
java -Xmx4g -jar "$PLANETILER_JAR" \
  --osm-path="$WORK/belgrade.osm.pbf" \
  --output="$WORK/belgrade.mbtiles" \
  --maxzoom="$MAXZOOM" \
  --download \
  --force

echo "→ Converting MBTiles → PMTiles…"
pmtiles convert "$WORK/belgrade.mbtiles" "$OUT" --force

SIZE_MB=$(du -m "$OUT" | cut -f1)
echo "✔ Wrote $OUT (${SIZE_MB} MB)"
echo "  Serve with byte-range support (see deploy/nginx.conf)."
