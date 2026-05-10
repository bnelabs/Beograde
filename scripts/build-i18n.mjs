#!/usr/bin/env node
// CLI: reads src/i18n/sr-Latn.json and src/i18n/sr-cyr-overrides.json,
// writes src/i18n/sr-Cyrl.json. Fails the build if any string does not
// round-trip and has no override.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runBuildI18n } from './lib/build-i18n-core.mjs';

const srLatn = JSON.parse(readFileSync(resolve('src/i18n/sr-Latn.json'), 'utf8'));
const overrides = JSON.parse(readFileSync(resolve('src/i18n/sr-cyr-overrides.json'), 'utf8'));

const { output, warnings } = await runBuildI18n({ srLatn, overrides });

if (warnings.length > 0) {
  for (const w of warnings) console.warn(`! ${w}`);
  console.error(`✗ ${warnings.length} string(s) do not round-trip cleanly. Add override entries to src/i18n/sr-cyr-overrides.json.`);
  process.exit(1);
}

writeFileSync(resolve('src/i18n/sr-Cyrl.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`✔ wrote src/i18n/sr-Cyrl.json (${Object.keys(output).length} top-level groups)`);
