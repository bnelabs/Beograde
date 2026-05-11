import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { createHash } from 'node:crypto';
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
 *  newer than the curator file. `force: true` rebuilds every Tier-A POI.
 *  `interPoiDelayMs` throttles requests between curated POIs to stay under
 *  Wikimedia's anonymous rate limit (~30 req/min). Default 0 keeps unit tests
 *  fast; the CLI passes a higher value for live runs.
 *  `mapillaryToken` is required if any curator file declares
 *  `sourceType: "mapillary"`; omitted when no Mapillary entries exist. */
export async function runBuildImages({ compiledPath, cacheDir, outDir, fetchFn, force = false, interPoiDelayMs = 0, mapillaryToken }) {
  const compiled = JSON.parse(readFileSync(compiledPath, 'utf8'));
  let curated = 0, skipped = 0, fresh = 0;

  for (const poi of compiled) {
    const curatorPath = joinPath(cacheDir, `${poi.id}.json`);
    if (!existsSync(curatorPath)) {
      skipped++;
      continue; // Tier B — POI ships images: []
    }
    const curator = loadCurator(curatorPath);
    const slugs = curator.images.map((img) => slugFor(poi.id, img));

    // Collision guard: two commonsFile names that differ only in punctuation
    // ("Beograd_view_1.jpg" vs "Beograd-view-1.jpg") slugify to the same
    // string and would silently overwrite each other on disk. Detect and fail
    // loudly — the curator must rename one of the files.
    const seen = new Map();
    for (let i = 0; i < slugs.length; i++) {
      if (seen.has(slugs[i])) {
        const j = seen.get(slugs[i]);
        const idA = curator.images[j].commonsFile ?? curator.images[j].mapillaryId ?? curator.images[j].source;
        const idB = curator.images[i].commonsFile ?? curator.images[i].mapillaryId ?? curator.images[i].source;
        throw new Error(`runBuildImages: ${poi.id} curator has two images that slugify to "${slugs[i]}": "${idA}" and "${idB}" — rename / re-source one`);
      }
      seen.set(slugs[i], i);
    }

    if (!force && isFresh({ curatorPath, outDir, poiId: poi.id, expectedSlugs: slugs, widths: WIDTHS })) {
      fresh++;
      continue;
    }

    const perImage = [];
    for (let i = 0; i < curator.images.length; i++) {
      const c = curator.images[i];
      const slug = slugs[i];
      const { buffer, width: srcW, height: srcH } = await resolveSource(c, fetchFn, { mapillaryToken });
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

    // Persist after each successful POI so a mid-run failure on POI N+1
    // does not strand POIs 1..N with on-disk AVIFs but no ImageAsset[]
    // entries in compiled.json (which would make them appear fresh on
    // re-run and never get their entries written).
    writeFileSync(compiledPath, JSON.stringify(compiled, null, 2) + '\n');

    if (interPoiDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, interPoiDelayMs));
    }
  }

  // No-op re-write when per-POI persistence already ran; covers the
  // all-fresh / all-skipped path where no per-POI write was triggered.
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

// Wikimedia's User-Agent policy requires a descriptive identifier so that
// abusive bots can be contacted or blocked. Without this, anonymous fetches
// are throttled aggressively (observed: HTTP 429 after ~3 sequential requests).
const COMMONS_USER_AGENT = 'Beograde/1.0 (https://github.com/bnelabs/Beograde; image-curation pipeline)';

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
  const res = await fetchFn(url, { headers: { 'User-Agent': COMMONS_USER_AGENT } });
  if (!res.ok) {
    throw new Error(`fetchCommonsFile: ${url} → ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  }
  const ab = await res.arrayBuffer();
  const buffer = Buffer.from(ab);
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width, height: meta.height };
}

/** Licenses we accept on `sourceType: "direct-url"` curator entries.
 *  Commons-fetched entries inherit Commons' own license screening so this list
 *  applies only to non-Commons sources where the operator hand-authors the
 *  license string. Match is exact (case-insensitive). */
const ACCEPTED_DIRECT_LICENSES = new Set([
  'cc0',
  'public domain',
  'cc by 2.0', 'cc by 3.0', 'cc by 4.0',
  'cc by-sa 2.0', 'cc by-sa 3.0', 'cc by-sa 3.0 rs', 'cc by-sa 4.0',
]);

/** Read + validate a curator file. Returns { images, fetchedAt }. Throws on
 *  malformed input — the calling pipeline must surface the error, not skip.
 *  All thrown errors are prefixed with `${path}: ` so the operator can
 *  identify the offending file.
 *
 *  Three image shapes are accepted:
 *  - `sourceType: "commons"` (default when omitted): requires commonsFile.
 *  - `sourceType: "direct-url"`: requires fetchUrl, forbids commonsFile,
 *    and license must be in ACCEPTED_DIRECT_LICENSES.
 *  - `sourceType: "mapillary"`: requires numeric mapillaryId; license must
 *    be "CC BY-SA 4.0" (Mapillary's only license); forbids commonsFile and
 *    fetchUrl. */
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
    const sourceType = img.sourceType ?? 'commons';
    if (sourceType !== 'commons' && sourceType !== 'direct-url' && sourceType !== 'mapillary') {
      throw new Error(`${path}: unknown sourceType "${sourceType}" (expected "commons", "direct-url", or "mapillary")`);
    }
    for (const key of ['credit', 'license', 'source']) {
      if (typeof img[key] !== 'string' || !img[key]) {
        throw new Error(`${path}: image missing required field "${key}"`);
      }
    }
    if (sourceType === 'commons') {
      if (typeof img.commonsFile !== 'string' || !img.commonsFile) {
        throw new Error(`${path}: image missing required field "commonsFile"`);
      }
      if (!img.commonsFile.startsWith('File:')) {
        throw new Error(`${path}: commonsFile must start with "File:" — got "${img.commonsFile}"`);
      }
      if (img.fetchUrl) {
        throw new Error(`${path}: sourceType=commons must not carry fetchUrl`);
      }
      if (img.mapillaryId) {
        throw new Error(`${path}: sourceType=commons must not carry mapillaryId`);
      }
    } else if (sourceType === 'direct-url') {
      if (typeof img.fetchUrl !== 'string' || !img.fetchUrl) {
        throw new Error(`${path}: sourceType=direct-url requires "fetchUrl"`);
      }
      if (img.commonsFile) {
        throw new Error(`${path}: sourceType=direct-url must not carry commonsFile`);
      }
      if (img.mapillaryId) {
        throw new Error(`${path}: sourceType=direct-url must not carry mapillaryId`);
      }
      if (!ACCEPTED_DIRECT_LICENSES.has(img.license.toLowerCase())) {
        throw new Error(`${path}: license "${img.license}" not in the direct-url accepted list (${[...ACCEPTED_DIRECT_LICENSES].join(', ')})`);
      }
    } else {
      if (typeof img.mapillaryId !== 'string' || !/^\d+$/.test(img.mapillaryId)) {
        throw new Error(`${path}: sourceType=mapillary requires "mapillaryId" as a numeric string`);
      }
      if (img.commonsFile) {
        throw new Error(`${path}: sourceType=mapillary must not carry commonsFile`);
      }
      if (img.fetchUrl) {
        throw new Error(`${path}: sourceType=mapillary must not carry fetchUrl`);
      }
      if (img.license.toLowerCase() !== 'cc by-sa 4.0') {
        throw new Error(`${path}: sourceType=mapillary license must be exactly "CC BY-SA 4.0" — got "${img.license}"`);
      }
    }
  }
  return raw;
}

/** Fetch an arbitrary direct URL with the descriptive UA. Returns Buffer +
 *  source dimensions, mirroring fetchCommonsFile. */
export async function fetchDirectUrl(fetchUrl, fetchFn) {
  const res = await fetchFn(fetchUrl, { headers: { 'User-Agent': COMMONS_USER_AGENT } });
  if (!res.ok) {
    throw new Error(`fetchDirectUrl: ${fetchUrl} → ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  }
  const ab = await res.arrayBuffer();
  const buffer = Buffer.from(ab);
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width, height: meta.height };
}

/** Fetch a Mapillary image by ID. Two-step: (1) GET the Graph API to discover
 *  the CDN URL of the 2048-wide thumbnail; (2) GET the CDN URL for binary
 *  bytes. Token is sent only on step 1 (CDN URLs are pre-signed and reject
 *  Authorization headers). Returns Buffer + dimensions. */
export async function fetchMapillary(mapillaryId, fetchFn, accessToken) {
  if (!accessToken) {
    throw new Error('fetchMapillary: MAPILLARY_TOKEN is required for sourceType=mapillary entries');
  }
  const metaUrl = `https://graph.mapillary.com/${encodeURIComponent(mapillaryId)}?fields=thumb_2048_url`;
  const metaRes = await fetchFn(metaUrl, {
    headers: { Authorization: `OAuth ${accessToken}`, 'User-Agent': COMMONS_USER_AGENT },
  });
  if (!metaRes.ok) {
    throw new Error(`fetchMapillary: ${metaUrl} → ${metaRes.status}${metaRes.statusText ? ' ' + metaRes.statusText : ''}`);
  }
  const meta = await metaRes.json();
  if (!meta?.thumb_2048_url || typeof meta.thumb_2048_url !== 'string') {
    throw new Error(`fetchMapillary: ${mapillaryId} response missing thumb_2048_url`);
  }
  const imgRes = await fetchFn(meta.thumb_2048_url, { headers: { 'User-Agent': COMMONS_USER_AGENT } });
  if (!imgRes.ok) {
    throw new Error(`fetchMapillary: CDN ${meta.thumb_2048_url} → ${imgRes.status}${imgRes.statusText ? ' ' + imgRes.statusText : ''}`);
  }
  const ab = await imgRes.arrayBuffer();
  const buffer = Buffer.from(ab);
  const sharpMeta = await sharp(buffer).metadata();
  return { buffer, width: sharpMeta.width, height: sharpMeta.height };
}

/** Dispatch a curator image to the right fetcher based on sourceType. */
export async function resolveSource(image, fetchFn, { mapillaryToken } = {}) {
  const sourceType = image.sourceType ?? 'commons';
  if (sourceType === 'direct-url') {
    return fetchDirectUrl(image.fetchUrl, fetchFn);
  }
  if (sourceType === 'mapillary') {
    return fetchMapillary(image.mapillaryId, fetchFn, mapillaryToken);
  }
  return fetchCommonsFile(image.commonsFile, fetchFn);
}

/** Compute the on-disk slug for a curator image. Commons entries derive
 *  the slug from commonsFile (existing behavior); direct-url entries hash
 *  the source URL into a stable 8-char suffix on the poi id; mapillary
 *  entries use a deterministic "mly-<first 8 digits of id>" suffix. */
export function slugFor(poiId, image) {
  const sourceType = image.sourceType ?? 'commons';
  if (sourceType === 'direct-url') {
    const hash = createHash('sha1').update(image.source).digest('hex').slice(0, 8);
    return `${poiId}-${hash}`;
  }
  if (sourceType === 'mapillary') {
    return `${poiId}-mly-${image.mapillaryId.slice(0, 12)}`;
  }
  return slugify(image.commonsFile.replace(/^File:/, ''));
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
