import { latnToCyrl, roundTripsCleanly } from './translit.mjs';

/**
 * Walk every leaf in srLatn, transliterate, apply overrides, collect warnings.
 * Returns { output, warnings }. Does not touch the filesystem.
 */
export async function runBuildI18n({ srLatn, overrides }) {
  const warnings = [];
  function walk(obj, path) {
    if (typeof obj === 'string') {
      const overrideKey = path.join('.');
      if (overrides[overrideKey] !== undefined) return overrides[overrideKey];
      const cyrl = latnToCyrl(obj);
      if (!roundTripsCleanly(obj)) warnings.push(`${overrideKey}: \"${obj}\" does not round-trip cleanly; add override`);
      return cyrl;
    }
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === '_doc') continue;
        out[k] = walk(v, [...path, k]);
      }
      return out;
    }
    return obj;
  }
  return { output: walk(srLatn, []), warnings };
}
