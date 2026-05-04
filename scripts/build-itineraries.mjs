#!/usr/bin/env node
// Replace placeholder straight-line itinerary geometries with real walking
// routes from the public OSRM demo server.
//
//   node scripts/build-itineraries.mjs
//
// The OSRM demo server has rate limits and is best-effort; for production
// builds, point OSRM_BASE at your own instance.
//
// Reads:  src/app/data/itineraries.ts (stop ordering)
//         src/assets/pois.json        (coordinates)
// Writes: src/assets/itineraries/<id>.geojson
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const OSRM_BASE = process.env.OSRM_BASE ?? 'https://router.project-osrm.org';

const pois = JSON.parse(
  await readFile(resolve(root, 'src/assets/pois.json'), 'utf8'),
);
const poiById = new Map(pois.map((p) => [p.id, p]));

// Lift the stop lists out of the TS file with a forgiving regex; avoids
// dragging in a TS toolchain just for a build script.
const itinerariesTs = await readFile(
  resolve(root, 'src/app/data/itineraries.ts'),
  'utf8',
);
const itineraries = parseItineraries(itinerariesTs);

for (const it of itineraries) {
  const coords = it.stops
    .map((s) => poiById.get(s.poiId))
    .filter(Boolean)
    .map((p) => [p.lng, p.lat]);
  if (coords.length < 2) {
    console.warn(`! ${it.id}: not enough stops, skipped`);
    continue;
  }
  const route = await fetchRoute(coords);
  const out = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: it.id, kind: route ? 'osrm-walk' : 'fallback-straight-lines' },
        geometry: { type: 'LineString', coordinates: route ?? coords },
      },
    ],
  };
  const path = resolve(root, 'src/assets/itineraries', `${it.id}.geojson`);
  await writeFile(path, JSON.stringify(out, null, 2));
  console.log(`✔ ${it.id} (${out.features[0].geometry.coordinates.length} pts)`);
  await new Promise((r) => setTimeout(r, 1000)); // be polite to the demo server
}

async function fetchRoute(coords) {
  const path = coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/foot/${path}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json?.routes?.[0]?.geometry?.coordinates ?? null;
  } catch (e) {
    console.warn(`  router failed: ${e.message}; using straight lines`);
    return null;
  }
}

function parseItineraries(src) {
  const blocks = [...src.matchAll(/\{\s*id:\s*'([^']+)',[\s\S]*?stops:\s*\[([\s\S]*?)\]/g)];
  return blocks.map(([, id, stopsBlock]) => {
    const stops = [...stopsBlock.matchAll(/poiId:\s*'([^']+)'/g)].map(([, poiId]) => ({ poiId }));
    return { id, stops };
  });
}
