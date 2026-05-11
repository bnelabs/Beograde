#!/usr/bin/env node
// CLI: reads src/assets/pois.compiled.json + data/poi-images/, fetches
// Wikimedia Commons / direct-URL / Mapillary sources, writes
// src/assets/poi/<id>/*.avif, and merges ImageAsset[] back into
// pois.compiled.json. Manual; not in prebuild.
//
// MAPILLARY_TOKEN env var is required when any curator file uses
// sourceType: "mapillary". Set it in .env (which is gitignored) and the
// pipeline will pick it up via Node's --env-file flag, or export it manually.
import { runBuildImages } from './lib/build-images-core.mjs';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

// Minimal .env loader so callers don't need Node 20+'s --env-file flag.
// Only loads keys that aren't already set in the environment.
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, key, value] = m;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv(resolve('.env'));

const force = process.argv.includes('--force');

const result = await runBuildImages({
  compiledPath: resolve('src/assets/pois.compiled.json'),
  cacheDir: resolve('data/poi-images'),
  outDir: resolve('src/assets/poi'),
  fetchFn: globalThis.fetch,
  force,
  // 1.5s between curated POIs keeps us comfortably under Wikimedia's
  // anonymous ~30 req/min ceiling for the live image fetch.
  interPoiDelayMs: 1500,
  mapillaryToken: process.env.MAPILLARY_TOKEN,
});

console.log(`✔ curated ${result.curated} POI(s); ${result.fresh} already fresh; ${result.skipped} without curator file (Tier B)`);
