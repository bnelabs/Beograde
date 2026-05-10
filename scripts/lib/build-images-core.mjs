import sharp from 'sharp';
import { readFileSync } from 'node:fs';

// Pipeline core. Pure async functions + the runBuildImages orchestrator.
// Helpers are added in subsequent tasks.

export async function runBuildImages() {
  throw new Error('not implemented');
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
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=2400`;
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
