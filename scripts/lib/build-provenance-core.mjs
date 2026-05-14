import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkWikipedia,
  checkOSM,
  checkOfficial,
  checkCrowdsourced,
  score,
  isPublishable,
} from './provenance-checks.mjs';
import { latnToCyrl } from './translit.mjs';

function fillBoth(b) {
  const out = { ...b };
  if (!out.sr_cyr) out.sr_cyr = latnToCyrl(out.sr_lat || out.en || '');
  if (!out.tr) out.tr = out.en || '';
  return out;
}

function fillBothList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(fillBoth);
}

/**
 * Drives the four-check pipeline over every POI and writes pois.compiled.json.
 * `fetchFn` is injected so unit tests can run without network.
 */
export async function runBuildProvenance({ srcPath, outPath, cacheDir, fetchFn, geoapifyCacheDir }) {
  const list = JSON.parse(readFileSync(srcPath, 'utf8'));
  let published = 0, failed = 0;
  const compiled = [];

  // The build-images pipeline writes ImageAsset[] entries into the output
  // file (pois.compiled.json) directly — that file is the merge target for
  // both pipelines. Without this guard, a build-provenance run after
  // build-images would silently strip the image entries (pois.json itself
  // always has `"images": []`). Snapshot the prior images keyed by id so
  // every enriched POI re-inherits them.
  const priorImages = new Map();
  if (existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      for (const p of prev) {
        if (Array.isArray(p?.images) && p.images.length > 0) {
          priorImages.set(p.id, p.images);
        }
      }
    } catch (e) {
      // Malformed prior file — let it be overwritten with a clean compile.
    }
  }

  for (const poi of list) {
    const cachedSourcesPath = join(cacheDir, `${poi.id}.json`);
    let cached = { sources: [] };
    if (existsSync(cachedSourcesPath)) {
      try {
        cached = JSON.parse(readFileSync(cachedSourcesPath, 'utf8'));
      } catch (e) {
        throw new Error(`failed to parse provenance cache for ${poi.id} at ${cachedSourcesPath}: ${e.message}`);
      }
    }
    const sources = [...poi.sources, ...cached.sources];

    const wiki = await checkWikipedia(poi.wikipediaTitle, 'en', fetchFn);
    const osm = await checkOSM(poi.osmRef, fetchFn);
    const official = checkOfficial(sources);
    const crowd = checkCrowdsourced(sources);

    if (wiki.pass && wiki.url) sources.push({ kind: 'wikipedia', url: wiki.url, lang: 'en' });
    if (osm.pass) sources.push({ kind: 'osm', ref: osm.ref });

    const checks = {
      wikipedia: wiki.pass,
      osm: osm.pass,
      official: official.pass,
      crowdsourced: crowd.pass,
    };
    const reliability = { score: score(checks), checks };
    poi.name = fillBoth(poi.name);
    poi.description = fillBoth(poi.description);
    poi.address = fillBoth(poi.address);
    if (poi.hours?.notes) poi.hours.notes = fillBoth(poi.hours.notes);
    if (poi.highlights) poi.highlights = fillBothList(poi.highlights);
    if (poi.tips) poi.tips = fillBothList(poi.tips);
    if (poi.history) poi.history = fillBoth(poi.history);
    if (poi.whatToExpect) {
      poi.whatToExpect = {
        pros: fillBothList(poi.whatToExpect.pros ?? []),
        cons: fillBothList(poi.whatToExpect.cons ?? []),
      };
    }
    if (Array.isArray(poi.activities)) {
      poi.activities = poi.activities.map(a => ({
        ...a,
        title: fillBoth(a.title),
        summary: fillBoth(a.summary),
      }));
    }
    const enriched = { ...poi, sources, reliability };
    if (priorImages.has(poi.id)) {
      enriched.images = priorImages.get(poi.id);
    }
    if (geoapifyCacheDir) {
      const geoPath = join(geoapifyCacheDir, `${poi.id}.json`);
      if (existsSync(geoPath)) {
        try {
          const rec = JSON.parse(readFileSync(geoPath, 'utf8'));
          if (rec?.goodToKnow && Object.keys(rec.goodToKnow).length > 0) {
            enriched.goodToKnow = rec.goodToKnow;
          }
        } catch (e) {
          throw new Error(`failed to parse geoapify cache for ${poi.id} at ${geoPath}: ${e.message}`);
        }
      }
    }
    if (!isPublishable({ checks, editorialConfidence: poi.editorialConfidence })) {
      failed++;
      console.error(`✗ ${poi.id} not publishable (score ${reliability.score}, conf ${poi.editorialConfidence})`);
      continue;
    }
    published++;
    compiled.push(enriched);
  }

  writeFileSync(outPath, JSON.stringify(compiled, null, 2) + '\n');
  return { published, failed };
}
