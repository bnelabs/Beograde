#!/usr/bin/env node
// Discovery helper: given a POI id, query Mapillary near its coordinates
// and print the top image candidates ranked by recency × pixel count, so
// a human can pick the best one to drop into data/poi-images/<id>.json.
//
//   node scripts/discover-mapillary.mjs <poi-id> [radius-meters=80] [limit=8]
//
// Requires MAPILLARY_TOKEN in .env or the environment.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadDotEnv(resolve('.env'));

const TOKEN = process.env.MAPILLARY_TOKEN;
if (!TOKEN) {
  console.error('Set MAPILLARY_TOKEN in .env or the environment.');
  process.exit(1);
}

const [poiId, radiusArg, limitArg] = process.argv.slice(2);
if (!poiId) {
  console.error('Usage: node scripts/discover-mapillary.mjs <poi-id> [radius=80] [limit=8]');
  process.exit(1);
}
const radius = Number(radiusArg ?? 80);
const limit = Number(limitArg ?? 8);

const compiled = JSON.parse(readFileSync(resolve('src/assets/pois.compiled.json'), 'utf8'));
const poi = compiled.find((p) => p.id === poiId);
if (!poi) { console.error(`POI not found: ${poiId}`); process.exit(1); }

// bbox roughly equivalent to a radius in meters (1° lat ≈ 111 km).
const dLat = radius / 111000;
const dLng = radius / (111000 * Math.cos(poi.lat * Math.PI / 180));
const bbox = [poi.lng - dLng, poi.lat - dLat, poi.lng + dLng, poi.lat + dLat].join(',');

const url = `https://graph.mapillary.com/images?bbox=${bbox}&limit=50&fields=id,thumb_2048_url,captured_at,creator,width,height,is_pano,compass_angle`;
const res = await fetch(url, { headers: { Authorization: `OAuth ${TOKEN}` } });
if (!res.ok) { console.error(`Mapillary API ${res.status} ${res.statusText}`); process.exit(1); }
const { data } = await res.json();

const scored = data
  .filter((x) => !x.is_pano) // 360° panos crop weirdly in 16:10 hero
  .map((x) => {
    const pixels = (x.width ?? 0) * (x.height ?? 0);
    const ageDays = (Date.now() - x.captured_at) / 86400000;
    // recency × resolution. 1000-day-old image scored same as 4× lower-res same year.
    const score = pixels / 1_000_000 * (1 / (1 + ageDays / 365));
    return { ...x, score };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);

console.log(`\nTop ${scored.length} non-pano Mapillary images near ${poiId} (${poi.lat}, ${poi.lng}, radius ${radius} m):\n`);
for (const x of scored) {
  const date = new Date(x.captured_at).toISOString().slice(0, 10);
  const creator = x.creator?.username ?? 'unknown';
  console.log(`  ${x.id.padEnd(20)}  ${x.width}×${x.height}  ${date}  ${creator}`);
  console.log(`    web:  https://www.mapillary.com/app/?focus=photo&pKey=${x.id}`);
  console.log(`    thumb: ${x.thumb_2048_url}`);
}
console.log();
