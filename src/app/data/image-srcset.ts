import { ImageAsset } from './types';

const WIDTHS = [640, 1024, 1600] as const;
const CANONICAL_WIDTH = 1024;

/**
 * Derive a `srcset` string from a canonical `-1024.avif` ImageAsset.
 *
 * The build-images pipeline always writes 640/1024/1600 variants beside the
 * curated 1024 entry. Rather than carrying all three in `pois.compiled.json`,
 * we reconstruct the set in the consumer by string substitution. If `.src`
 * doesn't include `-1024.`, fall back to the single-asset srcset (defensive).
 */
export function buildSrcset(asset: ImageAsset): string {
  const marker = `-${CANONICAL_WIDTH}.`;
  if (!asset.src.includes(marker)) {
    return `${asset.src} ${asset.width}w`;
  }
  return WIDTHS
    .map((w) => `${asset.src.replace(marker, `-${w}.`)} ${w}w`)
    .join(', ');
}

export function fallbackSizes(kind: 'hero' | 'tile'): string {
  if (kind === 'hero') return '100vw';
  return '(min-width: 800px) 240px, 40vw';
}
