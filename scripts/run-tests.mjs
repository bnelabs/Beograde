#!/usr/bin/env node
// Run every `*.test.mjs` under `scripts/lib/` through node:test.
// Exits non-zero if any test fails; intentionally minimal so CI can drive it.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const libDir = resolve(here, 'lib');
const tests = readdirSync(libDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => resolve(libDir, f));

if (tests.length === 0) {
  console.log('no script tests found');
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  ['--test', '--test-reporter=spec', ...tests],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
