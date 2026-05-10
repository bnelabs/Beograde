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
 *  Returns { [width]: Buffer }. Aspect ratio preserved (width-based resize). */
export async function transcodeAvif(buffer, widths) {
  const out = {};
  for (const w of widths) {
    out[w] = await sharp(buffer)
      .resize({ width: w, withoutEnlargement: true })
      .avif({ quality: 50, effort: 4 })
      .toBuffer();
  }
  return out;
}
