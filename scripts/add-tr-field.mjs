#!/usr/bin/env node
/**
 * One-shot: add `tr: ""` to every Bilingual literal in src/assets/pois.json.
 *
 * A Bilingual literal is any object that has en + sr_lat + sr_cyr keys.
 * tr is left empty so build-provenance can auto-draft it from en (same pattern
 * as sr_cyr ← sr_lat). Existing tr values are preserved.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve('src/assets/pois.json');
const raw = readFileSync(path, 'utf8');
const data = JSON.parse(raw);

let added = 0;
function visit(node) {
  if (Array.isArray(node)) {
    for (const x of node) visit(x);
    return;
  }
  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    if (
      typeof node.en === 'string' &&
      typeof node.sr_lat === 'string' &&
      typeof node.sr_cyr === 'string' &&
      typeof node.tr !== 'string'
    ) {
      node.tr = '';
      added++;
    }
    for (const k of keys) visit(node[k]);
  }
}
visit(data);

writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`✔ added tr: "" to ${added} Bilingual literal(s) in ${path}`);
