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

function fillCyr(b) {
  if (b.sr_cyr) return b;
  return { ...b, sr_cyr: latnToCyrl(b.sr_lat || b.en || '') };
}

/**
 * Drives the four-check pipeline over every POI and writes pois.compiled.json.
 * `fetchFn` is injected so unit tests can run without network.
 */
export async function runBuildProvenance({ srcPath, outPath, cacheDir, fetchFn }) {
  const list = JSON.parse(readFileSync(srcPath, 'utf8'));
  let published = 0, failed = 0;
  const compiled = [];

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
    poi.name = fillCyr(poi.name);
    poi.description = fillCyr(poi.description);
    poi.address = fillCyr(poi.address);
    if (poi.hours?.notes) poi.hours.notes = fillCyr(poi.hours.notes);
    const enriched = { ...poi, sources, reliability };
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
