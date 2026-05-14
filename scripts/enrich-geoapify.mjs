#!/usr/bin/env node
// One-off enrichment: walk pois.compiled.json, geocode each POI by name +
// proximity, then fetch Place Details for the matched ID and write a
// `goodToKnow` block to data/geoapify-cache/<id>.json. The build pipeline
// (build-provenance) merges that block into the next pois.compiled.json.
//
// Runtime never talks to Geoapify. This script is the only network step.
//
// Usage:
//   GEOAPIFY_API_KEY=... node scripts/enrich-geoapify.mjs           # skips cached
//   GEOAPIFY_API_KEY=... node scripts/enrich-geoapify.mjs --force   # refetch all
//   GEOAPIFY_API_KEY=... node scripts/enrich-geoapify.mjs --id=hotel-moskva
//
// Flags:
//   --force    refetch even when cache exists
//   --id=<id>  run for a single POI

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pickBestMatch, extractGoodToKnow } from './lib/geoapify-enrich-core.mjs';

const API_KEY = process.env.GEOAPIFY_API_KEY;
if (!API_KEY) {
  console.error('GEOAPIFY_API_KEY env var not set. Get one at https://myprojects.geoapify.com/');
  process.exit(2);
}

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const onlyId = [...args].find(a => a.startsWith('--id='))?.slice(5);

const SRC = resolve('src/assets/pois.compiled.json');
const CACHE_DIR = resolve('data/geoapify-cache');
mkdirSync(CACHE_DIR, { recursive: true });

const PLACE_FEATURES = 'details,details.facilities,details.catering,details.wiki_and_media,details.heritage,details.building';

const pois = JSON.parse(readFileSync(SRC, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

async function geocode(poi) {
  const text = `${poi.name.en} ${poi.region === 'day-trip' ? 'Serbia' : 'Belgrade'}`;
  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.searchParams.set('text', text);
  url.searchParams.set('bias', `proximity:${poi.lng},${poi.lat}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('apiKey', API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geocode HTTP ${res.status} for ${poi.id}`);
  return res.json();
}

async function placeDetails(place_id) {
  const url = new URL('https://api.geoapify.com/v2/place-details');
  url.searchParams.set('id', place_id);
  url.searchParams.set('features', PLACE_FEATURES);
  url.searchParams.set('apiKey', API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`place-details HTTP ${res.status} for id ${place_id}`);
  return res.json();
}

let processed = 0, written = 0, unmatched = 0, skipped = 0, failed = 0;
for (const poi of pois) {
  if (onlyId && poi.id !== onlyId) continue;
  const cachePath = join(CACHE_DIR, `${poi.id}.json`);
  if (!force && existsSync(cachePath)) { skipped++; continue; }
  processed++;
  try {
    const geo = await geocode(poi);
    const match = pickBestMatch(geo, poi);
    if (!match) {
      writeFileSync(cachePath, JSON.stringify({ fetchedAt: today, matched: null }, null, 2) + '\n');
      console.log(`✗ ${poi.id} no confident match`);
      unmatched++;
      continue;
    }
    const details = await placeDetails(match.place_id);
    const goodToKnow = extractGoodToKnow(details);
    const record = { fetchedAt: today, place_id: match.place_id, matched: match, goodToKnow };
    writeFileSync(cachePath, JSON.stringify(record, null, 2) + '\n');
    const keys = Object.keys(goodToKnow);
    console.log(`✔ ${poi.id} → ${match.name} (${match.distanceM} m)  fields: ${keys.length ? keys.join(',') : '(none)'}`);
    written++;
  } catch (e) {
    console.error(`! ${poi.id} failed:`, e.message);
    failed++;
  }
}

console.log(`\nprocessed=${processed}  written=${written}  unmatched=${unmatched}  skipped=${skipped}  failed=${failed}`);
process.exit(failed > 0 ? 1 : 0);
