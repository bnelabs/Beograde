import sharp from 'sharp';

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
