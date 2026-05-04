#!/usr/bin/env node
/*
 * One-shot migration of src/assets/pois.json from v1 (free-text) to v2
 * (bilingual + structured hours + provenance + editorial confidence).
 *
 * Idempotent — running twice on a v2 file leaves it unchanged.
 *
 * Hours are mapped from common free-text phrases to OSM opening_hours grammar.
 * Anything we can't parse becomes raw === '' and HoursService returns 'unknown'.
 *
 * sr_lat is identical to en for this pass; SR-Latin content is hand-translated
 * later. sr_cyr is left empty in Phase 1a (Cyrillic toggle hidden).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve('src/assets/pois.json');
const raw = readFileSync(path, 'utf8');
const list = JSON.parse(raw);

const HOURS_MAP = {
  'Open 24h (museums 10:00–17:00)': '24/7; museums Mo-Su 10:00-17:00',
  '07:00–22:00': 'Mo-Su 07:00-22:00',
  'Restaurants typically 11:00–01:00': 'Mo-Su 11:00-01:00',
  '12:00–00:00': 'Mo-Su 12:00-24:00',
  '23:00–05:00': 'Mo-Su 23:00-05:00',
  '18:00–02:00': 'Mo-Su 18:00-02:00',
  'Always open': '24/7',
  'Tue–Sun 10:00–18:00 (Thu until 20:00)': 'Tu-Su 10:00-18:00; Th 10:00-20:00',
  'Tue–Sun 10:00–18:00': 'Tu-Su 10:00-18:00',
  'Outside prayer times': '',
  'Tue–Sat 10:00–17:00, Sun 10:00–14:00': 'Tu-Sa 10:00-17:00; Su 10:00-14:00',
  '08:00–20:00 (summer)': 'Mo-Su 08:00-20:00',
  '10:00–22:00 (summer)': 'Mo-Su 10:00-22:00',
  '08:00–23:00': 'Mo-Su 08:00-23:00',
  '07:00–00:00': 'Mo-Su 07:00-24:00',
  '08:00–00:00': 'Mo-Su 08:00-24:00',
  'Bulevar kralja Aleksandra': '',
  '08:00–19:00': 'Mo-Su 08:00-19:00',
  'Tue–Sat 10:00–17:00': 'Tu-Sa 10:00-17:00',
  'Fri–Sat 23:00–08:00': 'Fr-Sa 23:00-08:00',
  '08:00–20:00': 'Mo-Su 08:00-20:00',
  '09:00–23:00': 'Mo-Su 09:00-23:00',
  '09:00–20:00': 'Mo-Su 09:00-20:00',
  'Variable': '',
};

function bilingual(s) {
  return { en: s, sr_lat: s, sr_cyr: '' };
}

function isV2(p) {
  return p && p.name && typeof p.name === 'object' && 'en' in p.name;
}

const today = new Date().toISOString().slice(0, 10);

const migrated = list.map(p => {
  if (isV2(p)) return p;

  const hoursRaw = HOURS_MAP[p.hours] ?? '';
  const out = {
    id: p.id,
    region: 'city',
    category: p.category,
    name: bilingual(p.name),
    description: bilingual(p.description),
    address: bilingual(p.address),
    lng: p.lng,
    lat: p.lat,
    tags: p.tags ?? [],
    images: [],
    verifiedAt: today,
    sources: [],
    reliability: {
      score: 0,
      checks: { wikipedia: false, osm: false, official: false, crowdsourced: false },
    },
    editorialConfidence: 'high',
  };
  if (hoursRaw) out.hours = { raw: hoursRaw };
  if (p.priceRange) out.pricing = { tier: p.priceRange };
  return out;
});

writeFileSync(path, JSON.stringify(migrated, null, 2) + '\n');
console.log(`migrated ${migrated.length} POIs (idempotent)`);
