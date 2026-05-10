#!/usr/bin/env node
// CLI: reads src/assets/pois.compiled.json + data/poi-images/, fetches
// Wikimedia Commons sources, writes src/assets/poi/<id>/*.avif, and merges
// ImageAsset[] back into pois.compiled.json. Manual; not in prebuild.
import { runBuildImages } from './lib/build-images-core.mjs';
import { resolve } from 'node:path';

const force = process.argv.includes('--force');

const result = await runBuildImages({
  compiledPath: resolve('src/assets/pois.compiled.json'),
  cacheDir: resolve('data/poi-images'),
  outDir: resolve('src/assets/poi'),
  fetchFn: globalThis.fetch,
  force,
});

console.log(`✔ curated ${result.curated} POI(s); ${result.fresh} already fresh; ${result.skipped} without curator file (Tier B)`);
