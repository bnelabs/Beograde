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
    const cached = existsSync(cachedSourcesPath)
      ? JSON.parse(readFileSync(cachedSourcesPath, 'utf8'))
      : { sources: [] };
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
