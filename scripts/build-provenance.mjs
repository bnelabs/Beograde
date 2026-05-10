#!/usr/bin/env node
// CLI: reads src/assets/pois.json + data/provenance-cache/, writes
// src/assets/pois.compiled.json. Used by npm run build:provenance.
import { runBuildProvenance } from './lib/build-provenance-core.mjs';
import { resolve } from 'node:path';

const result = await runBuildProvenance({
  srcPath: resolve('src/assets/pois.json'),
  outPath: resolve('src/assets/pois.compiled.json'),
  cacheDir: resolve('data/provenance-cache'),
  fetchFn: globalThis.fetch,
});

console.log(`✔ published ${result.published} POIs; ${result.failed} failed publish-rule gate`);
process.exit(result.failed > 0 ? 1 : 0);
