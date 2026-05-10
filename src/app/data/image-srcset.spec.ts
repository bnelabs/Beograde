import { buildSrcset, fallbackSizes } from './image-srcset';
import { ImageAsset } from './types';

describe('buildSrcset', () => {
  const asset: ImageAsset = {
    src: '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-1024.avif',
    width: 1024,
    height: 615,
    lqip: 'data:image/jpeg;base64,abc',
    credit: 'BrankaVV, CC BY-SA 4.0',
    license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Kalemegdan,_Belgrade_Fortress.jpg',
  };

  it('emits 640/1024/1600 widths derived from the -1024 src', () => {
    expect(buildSrcset(asset)).toBe(
      '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-640.avif 640w, ' +
      '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-1024.avif 1024w, ' +
      '/assets/poi/kalemegdan/kalemegdan-belgrade-fortress-1600.avif 1600w'
    );
  });

  it('falls back to a single-entry srcset when the canonical -1024 marker is missing', () => {
    const odd: ImageAsset = { ...asset, src: '/assets/poi/foo/foo-800.avif', width: 800 };
    expect(buildSrcset(odd)).toBe('/assets/poi/foo/foo-800.avif 800w');
  });

  it('replaces every -1024. marker (defensive for paths with the substring elsewhere)', () => {
    const tricky: ImageAsset = {
      ...asset,
      src: '/assets/poi/x/x-1024.avif',
    };
    expect(buildSrcset(tricky)).toContain('/assets/poi/x/x-640.avif 640w');
  });
});

describe('fallbackSizes', () => {
  it('returns 100vw for hero', () => {
    expect(fallbackSizes('hero')).toBe('100vw');
  });

  it('returns a tile-appropriate sizes for tile', () => {
    const s = fallbackSizes('tile');
    expect(s).toContain('vw');
    expect(s).toContain('px');
  });
});
