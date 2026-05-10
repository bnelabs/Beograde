import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { cyrlToLatn } from './translit.mjs';

// Pipeline core. Pure async functions + the runBuildImages orchestrator.
// Helpers are added in subsequent tasks.

const WIDTHS = [640, 1024, 1600];

/** Decide whether outputs for a POI are fresh relative to its curator file.
 *  Fresh = every expected AVIF exists, and the oldest AVIF is newer than
 *  the curator file. Returns true if no work is needed. */
function isFresh({ curatorPath, outDir, poiId, expectedSlugs, widths }) {
  const curatorMtime = statSync(curatorPath).mtimeMs;
  for (const slug of expectedSlugs) {
    for (const w of widths) {
      const p = joinPath(outDir, poiId, `${slug}-${w}.avif`);
      if (!existsSync(p)) return false;
      if (statSync(p).mtimeMs < curatorMtime) return false;
    }
  }
  return true;
}

/** Pipeline orchestrator. Reads pois.compiled.json, walks per-POI curator
 *  files in cacheDir, fetches Commons sources, transcodes to AVIF, writes
 *  per-POI dirs under outDir, and merges ImageAsset[] back into
 *  pois.compiled.json. Idempotent: skip if every output AVIF exists and is
 *  newer than the curator file. `force: true` rebuilds every Tier-A POI. */
export async function runBuildImages({ compiledPath, cacheDir, outDir, fetchFn, force = false }) {
  const compiled = JSON.parse(readFileSync(compiledPath, 'utf8'));
  let curated = 0, skipped = 0, fresh = 0;

  for (const poi of compiled) {
    const curatorPath = joinPath(cacheDir, `${poi.id}.json`);
    if (!existsSync(curatorPath)) {
      skipped++;
      continue; // Tier B — POI ships images: []
    }
    const curator = loadCurator(curatorPath);
    const slugs = curator.images.map((img) => slugify(img.commonsFile.replace(/^File:/, '')));

    if (!force && isFresh({ curatorPath, outDir, poiId: poi.id, expectedSlugs: slugs, widths: WIDTHS })) {
      fresh++;
      continue;
    }

    const perImage = [];
    for (let i = 0; i < curator.images.length; i++) {
      const c = curator.images[i];
      const slug = slugs[i];
      const { buffer, width: srcW, height: srcH } = await fetchCommonsFile(c.commonsFile, fetchFn);
      const transcoded = await transcodeAvif(buffer, WIDTHS);
      await writeAvifSet({ outDir, poiId: poi.id, slug, transcoded });
      const lqip = await jpegLqip(buffer);
      // 1024 variant dimensions: width=1024 (or smaller if source < 1024),
      // height computed from source aspect ratio.
      const width1024 = Math.min(1024, srcW);
      const height1024 = Math.round((width1024 / srcW) * srcH);
      perImage.push({ slug, lqip, width1024, height1024 });
    }

    poi.images = buildImageAssetEntries({ poiId: poi.id, curator, perImage });
    curated++;
  }

  writeFileSync(compiledPath, JSON.stringify(compiled, null, 2) + '\n');
  return { curated, skipped, fresh };
}

/** Produce a tiny base64 JPEG data-URI suitable for inline LQIP. */
export async function jpegLqip(buffer) {
  const out = await sharp(buffer)
    .resize(8, 8, { fit: 'cover' })
    .jpeg({ quality: 30 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString('base64')}`;
}

/** Fetch a Commons file via Special:FilePath, return Buffer + dimensions.
 *  Caps source width at 2400px to keep transcode work bounded. */
export async function fetchCommonsFile(commonsFile, fetchFn) {
  if (!commonsFile.startsWith('File:')) {
    throw new Error(`fetchCommonsFile: expected "File:" prefix, got "${commonsFile}"`);
  }
  const fileName = commonsFile.slice('File:'.length);
  // encodeURIComponent guards against `?`, `#`, spaces, apostrophes, and
  // non-ASCII characters in real Commons file names (mirrors checkWikipedia
  // in scripts/lib/provenance-checks.mjs).
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=2400`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`fetchCommonsFile: ${url} → ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  }
  const ab = await res.arrayBuffer();
  const buffer = Buffer.from(ab);
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width, height: meta.height };
}

/** Read + validate a curator file. Returns { images, fetchedAt }. Throws on
 *  malformed input — the calling pipeline must surface the error, not skip.
 *  All thrown errors are prefixed with `${path}: ` so the operator can
 *  identify the offending file. */
export function loadCurator(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${path}: top-level value must be an object`);
  }
  if (typeof raw.fetchedAt !== 'string' || !raw.fetchedAt) {
    throw new Error(`${path}: fetchedAt must be a non-empty string (date)`);
  }
  if (!Array.isArray(raw.images) || raw.images.length === 0) {
    throw new Error(`${path}: images must be a non-empty array`);
  }
  for (const img of raw.images) {
    if (!img || typeof img !== 'object' || Array.isArray(img)) {
      throw new Error(`${path}: each images entry must be an object`);
    }
    for (const key of ['commonsFile', 'credit', 'license', 'source']) {
      if (typeof img[key] !== 'string' || !img[key]) {
        throw new Error(`${path}: image missing required field "${key}"`);
      }
    }
    if (!img.commonsFile.startsWith('File:')) {
      throw new Error(`${path}: commonsFile must start with "File:" — got "${img.commonsFile}"`);
    }
  }
  return raw;
}

/** Transcode a source buffer to AVIF at each requested width.
 *  Returns { [width]: Buffer }. Aspect ratio preserved (width-based resize).
 *  `withoutEnlargement: true` means a width larger than the source clamps
 *  to source dimensions — caller must accept that the returned width may be
 *  smaller than requested when the source is small. */
export async function transcodeAvif(buffer, widths) {
  const src = sharp(buffer); // decode once; .clone() per width to avoid N× decode.
  const out = {};
  for (const w of widths) {
    out[w] = await src.clone()
      .resize({ width: w, withoutEnlargement: true })
      .avif({ quality: 50, effort: 4 })
      .toBuffer();
  }
  return out;
}

/** Filesystem-safe slug from a Commons file name or human title. Cyrillic
 *  inputs are transliterated to Latin first via cyrlToLatn (1b.1 module);
 *  without that step, Cyrillic codepoints would be silently stripped by the
 *  alphanumeric filter, producing useless empty slugs. */
export function slugify(s) {
  return cyrlToLatn(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip combining marks
    .replace(/\.[a-z0-9]+$/i, '')                      // drop extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Write each AVIF buffer under <outDir>/<poiId>/<slug>-<width>.avif.
 *  Returns { [width]: absolutePath }. Creates the per-POI dir as needed. */
export async function writeAvifSet({ outDir, poiId, slug, transcoded }) {
  const poiDir = joinPath(outDir, poiId);
  mkdirSync(poiDir, { recursive: true });
  const out = {};
  for (const [width, buf] of Object.entries(transcoded)) {
    const path = joinPath(poiDir, `${slug}-${width}.avif`);
    writeFileSync(path, buf);
    out[width] = path;
  }
  return out;
}

/** Pair curator entries with per-image transcode results to produce
 *  ImageAsset[] (matches src/app/data/types.ts:26). */
export function buildImageAssetEntries({ poiId, curator, perImage }) {
  if (curator.images.length !== perImage.length) {
    throw new Error(`buildImageAssetEntries: ${poiId} curator has ${curator.images.length} images but received ${perImage.length} transcode results`);
  }
  return curator.images.map((c, i) => {
    const p = perImage[i];
    return {
      src: `/assets/poi/${poiId}/${p.slug}-1024.avif`,
      width: p.width1024,
      height: p.height1024,
      lqip: p.lqip,
      credit: c.credit,
      license: c.license,
      source: c.source,
    };
  });
}
