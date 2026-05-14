// Geoapify enrichment — pure helpers.
// The script (../enrich-geoapify.mjs) wires these to fetch + the cache.
// Tests drive the helpers directly with mocked API responses.
import { cyrlToLatn } from './translit.mjs';

/** Distance in meters between two lng/lat pairs (equirectangular approximation; ±0.5% at city scale). */
export function haversineM(lng1, lat1, lng2, lat2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DIACRITICS = /[̀-ͯ]/g;
export function normalizeName(s) {
  if (!s) return '';
  return s.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
    .replace(/[()'".,!?;:&\-\/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Count how many ≥4-char words from `our` appear in `theirs`. 0 = no match. */
export function wordOverlapCount(our, theirs) {
  const a = normalizeName(our).split(' ').filter(w => w.length >= 4);
  const b = normalizeName(theirs);
  if (!a.length || !b) return 0;
  let n = 0;
  for (const w of a) if (b.includes(w)) n++;
  return n;
}

/** Convenience boolean: at least one word overlaps. Kept for older callers
 * (tests). New code should use `wordOverlapCount` so it can rank candidates. */
export function nameOverlaps(our, theirs) {
  return wordOverlapCount(our, theirs) > 0;
}

/** OSM/Geoapify enum normalization: 'wlan' / 'yes' / 'wifi' → wifi states. */
function normalizeWifi(internetAccess, fee) {
  if (!internetAccess) return undefined;
  const v = String(internetAccess).toLowerCase();
  if (v === 'no') return 'no';
  if (v === 'yes' || v === 'wifi' || v === 'wlan' || v === 'terminal') {
    return fee === 'no' || fee === 'false' ? 'free' : 'yes';
  }
  return undefined;
}

function normalizeWheelchair(v) {
  if (v === 'yes' || v === 'limited' || v === 'no') return v;
  return undefined;
}

function normalizeBool(v) {
  if (v === 'yes' || v === true) return true;
  if (v === 'no' || v === false) return false;
  return undefined;
}

function extractPayments(props) {
  // Geoapify exposes OSM "payment:*" tags on the details feature.
  const out = [];
  const cards = props['payment:credit_cards'] ?? props['payment:debit_cards'] ?? props['payment:cards'];
  const cash = props['payment:cash'];
  const contactless = props['payment:contactless'];
  if (cards === 'yes') out.push('cards');
  if (cash === 'yes') out.push('cash');
  if (contactless === 'yes') out.push('contactless');
  return out.length ? out : undefined;
}

function extractHeritage(heritage) {
  if (!heritage || typeof heritage !== 'object') return undefined;
  // OSM heritage:level 0 = world (UNESCO), 1 = continental, 2 = national, 3 = regional, 4 = local
  const level = Number(heritage.level);
  if (level === 0) return 'unesco';
  if (level === 1 || level === 2) return 'national';
  if (level === 3 || level === 4) return 'regional';
  // Falls back when no level — surface as 'regional' so we still flag it.
  return 'regional';
}

/** OSM "website" tags sometimes hold YouTube/Instagram links that aren't
 * useful as an "Official site" CTA — drop those, keep only proper websites. */
function isUsableWebsite(url) {
  if (!/^https?:\/\//.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const deny = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'tiktok.com', 'x.com', 'twitter.com'];
    return !deny.some(d => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

function parseYear(s) {
  if (!s) return undefined;
  const m = String(s).match(/(\d{4})/);
  return m ? Number(m[1]) : undefined;
}

/** Walk the Place Details feature collection and synthesize a GoodToKnow.
 * Returns an empty object when nothing useful was found — callers can
 * filter to `null` upstream. */
export function extractGoodToKnow(placeDetailsResponse) {
  const features = Array.isArray(placeDetailsResponse?.features) ? placeDetailsResponse.features : [];
  const detailsBlocks = features
    .map(f => f?.properties ?? {})
    .filter(p => typeof p === 'object' && p);

  // Merge the various sub-feature payloads (details / details.facilities /
  // details.catering / …) into a single key bag for easier extraction.
  const merged = {};
  for (const block of detailsBlocks) {
    for (const [k, v] of Object.entries(block)) {
      // Prefer the first non-empty value per key; later blocks tend to be
      // nested re-emissions (e.g. wiki_and_media appears twice).
      if (merged[k] === undefined || merged[k] === null || merged[k] === '') merged[k] = v;
    }
  }

  const out = {};

  const wheelchair = normalizeWheelchair(merged.wheelchair);
  if (wheelchair) out.wheelchair = wheelchair;

  const wifi = normalizeWifi(merged.internet_access, merged['internet_access:fee']);
  if (wifi) out.wifi = wifi;

  const outdoor = normalizeBool(merged.outdoor_seating);
  if (outdoor !== undefined) out.outdoorSeating = outdoor;

  const takeaway = normalizeBool(merged.takeaway);
  if (takeaway !== undefined) out.takeaway = takeaway;

  const delivery = normalizeBool(merged.delivery);
  if (delivery !== undefined) out.delivery = delivery;

  const payments = extractPayments(merged);
  if (payments) out.payments = payments;

  if (typeof merged.cuisine === 'string' && merged.cuisine) out.cuisine = merged.cuisine;

  const wikidata = merged.wiki_and_media?.wikidata ?? merged.wikidata;
  if (typeof wikidata === 'string' && /^Q\d+$/.test(wikidata)) out.wikidata = wikidata;

  const heritage = extractHeritage(merged.heritage);
  if (heritage) out.heritage = heritage;

  if (typeof merged.accommodation?.stars === 'number') out.stars = merged.accommodation.stars;

  const year = parseYear(merged.building?.start_date);
  if (year) out.buildingYear = year;

  if (typeof merged.website === 'string' && isUsableWebsite(merged.website)) {
    out.website = merged.website;
  }

  return out;
}

/** Best name-overlap score across our EN/SR-Latin names against the
 * geocoding hit's name (transliterated from Cyrillic when needed) and any
 * international names Geoapify returned. */
function bestOverlap(poi, result) {
  const candidateNames = new Set();
  if (result.name) {
    candidateNames.add(result.name);
    candidateNames.add(cyrlToLatn(result.name));
  }
  if (result.name_international && typeof result.name_international === 'object') {
    for (const n of Object.values(result.name_international)) {
      if (typeof n === 'string') candidateNames.add(n);
    }
  }
  let best = 0;
  for (const cand of candidateNames) {
    best = Math.max(best, wordOverlapCount(poi.name.en, cand));
    best = Math.max(best, wordOverlapCount(poi.name.sr_lat, cand));
  }
  return best;
}

/** Pick the best geocoding hit. Scores every in-range result by name-overlap
 * count and returns the highest. Returns null when no result is both
 * within `maxDistanceM` AND shares at least one significant word with our
 * POI name. Fixes false positives like "Jugolab Subotica" winning over
 * "Subotica Synagogue" purely because it sorted first. */
export function pickBestMatch(geocodeResponse, poi, opts = {}) {
  // Default radius is intentionally loose — Geoapify's geocode coords for
  // tourist landmarks routinely drift hundreds of meters from the actual
  // venue (e.g. Subotica Synagogue is plotted ~550 m off). Name overlap is
  // the primary discriminator; distance is only the unrelated-venue guard.
  const { maxDistanceM = 600 } = opts;
  const results = Array.isArray(geocodeResponse?.results) ? geocodeResponse.results : [];
  let bestResult = null;
  let bestScore = 0;
  let bestDistance = Infinity;
  for (const r of results) {
    if (typeof r.lat !== 'number' || typeof r.lon !== 'number') continue;
    const distanceM = haversineM(poi.lng, poi.lat, r.lon, r.lat);
    if (distanceM > maxDistanceM) continue;
    const score = bestOverlap(poi, r);
    if (score === 0) continue;
    // Prefer higher overlap; tie-break by smaller distance.
    if (score > bestScore || (score === bestScore && distanceM < bestDistance)) {
      bestResult = r;
      bestScore = score;
      bestDistance = distanceM;
    }
  }
  if (!bestResult) return null;
  return {
    place_id: bestResult.place_id,
    name: bestResult.name,
    lat: bestResult.lat,
    lng: bestResult.lon,
    distanceM: Math.round(bestDistance),
  };
}
