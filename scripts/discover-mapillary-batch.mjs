#!/usr/bin/env node
// Batch discovery: given a list of POI ids on stdin or argv, query Mapillary near
// each one and print the top-3 visually diverse candidates (no duplicate sequence
// frames). Output is a JSON-ish block per POI ready to paste into curator files.
//
//   node scripts/discover-mapillary-batch.mjs kalemegdan saint-sava knez-mihailova
//   node scripts/discover-mapillary-batch.mjs --radius 120 --pick 3 <ids...>
//
// Requires MAPILLARY_TOKEN in .env.
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

const args = process.argv.slice(2);
let radius = 100;
let pick = 3;
const ids = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--radius') { radius = Number(args[++i]); continue; }
  if (args[i] === '--pick') { pick = Number(args[++i]); continue; }
  ids.push(args[i]);
}
if (ids.length === 0) {
  console.error('Usage: node scripts/discover-mapillary-batch.mjs [--radius N] [--pick N] <poi-ids...>');
  process.exit(1);
}

const compiled = JSON.parse(readFileSync(resolve('src/assets/pois.compiled.json'), 'utf8'));

function angDiff(a, b) {
  const d = Math.abs(((a ?? 0) - (b ?? 0) + 540) % 360 - 180);
  return d;
}

for (const poiId of ids) {
  const poi = compiled.find((p) => p.id === poiId);
  if (!poi) { console.log(`# ${poiId}: NOT FOUND`); continue; }

  const dLat = radius / 111000;
  const dLng = radius / (111000 * Math.cos(poi.lat * Math.PI / 180));
  const bbox = [poi.lng - dLng, poi.lat - dLat, poi.lng + dLng, poi.lat + dLat].join(',');
  const url = `https://graph.mapillary.com/images?bbox=${bbox}&limit=80&fields=id,thumb_2048_url,captured_at,creator,width,height,is_pano,compass_angle`;
  const res = await fetch(url, { headers: { Authorization: `OAuth ${TOKEN}` } });
  if (!res.ok) { console.log(`# ${poiId}: API ${res.status}`); continue; }
  const { data } = await res.json();

  const scored = (data ?? [])
    .filter((x) => !x.is_pano && x.width && x.height)
    .map((x) => {
      const pixels = x.width * x.height;
      const ageDays = (Date.now() - x.captured_at) / 86400000;
      const score = pixels / 1_000_000 * (1 / (1 + ageDays / 365));
      return { ...x, score };
    })
    .sort((a, b) => b.score - a.score);

  // Greedy diverse pick: keep one, then only add candidates that differ by >25° compass
  // AND >5 minutes capture time from every already-picked (avoid sequence dupes).
  const picked = [];
  for (const cand of scored) {
    if (picked.length >= pick) break;
    const tooSimilar = picked.some((p) =>
      angDiff(p.compass_angle, cand.compass_angle) < 25 &&
      Math.abs(p.captured_at - cand.captured_at) < 5 * 60 * 1000
    );
    if (tooSimilar) continue;
    picked.push(cand);
  }

  console.log(`\n# ${poiId}  (${poi.lat.toFixed(5)}, ${poi.lng.toFixed(5)}, r=${radius}m)`);
  for (const x of picked) {
    const date = new Date(x.captured_at).toISOString().slice(0, 10);
    const creator = x.creator?.username ?? 'unknown';
    console.log(`#   ${x.id}  ${x.width}×${x.height}  ${date}  ${creator}  bearing ${Math.round(x.compass_angle ?? 0)}°`);
    console.log(`#   https://www.mapillary.com/app/?focus=photo&pKey=${x.id}`);
    console.log(`    { "sourceType": "mapillary", "mapillaryId": "${x.id}", "credit": "${creator} (Mapillary), CC BY-SA 4.0", "license": "CC BY-SA 4.0", "source": "https://www.mapillary.com/app/?focus=photo&pKey=${x.id}" },`);
  }
}
console.log();
