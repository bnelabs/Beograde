#!/usr/bin/env bash
# Download SDF font glyphs for MapLibre (Noto Sans Regular by default).
# These are referenced from src/assets/styles/map-style.json (`glyphs` field)
# and must be hosted alongside the app for the offline pack to render labels.
#
# Output: src/assets/fonts/<fontstack>/<range>.pbf  (≈ 1–2 MB total per fontstack)
set -euo pipefail

OUT_DIR="${OUT_DIR:-src/assets/fonts}"
FONTSTACK="${FONTSTACK:-Noto Sans Regular}"
SOURCE_BASE="${SOURCE_BASE:-https://protomaps.github.io/basemaps-assets/fonts}"

ENCODED_FONT=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$FONTSTACK")
TARGET_DIR="$OUT_DIR/$FONTSTACK"
mkdir -p "$TARGET_DIR"

echo "→ Fetching glyph ranges for '$FONTSTACK' from $SOURCE_BASE…"
for start in $(seq 0 256 65280); do
  end=$((start + 255))
  range="${start}-${end}"
  url="$SOURCE_BASE/$ENCODED_FONT/$range.pbf"
  out="$TARGET_DIR/$range.pbf"
  if [[ -f "$out" ]]; then continue; fi
  if curl -sf -o "$out" "$url"; then
    printf '.'
  else
    rm -f "$out"
  fi
done
echo
echo "✔ Glyphs written to $TARGET_DIR"
