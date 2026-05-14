import { defaultLocaleFromBrowser, pick } from './i18n';
import type { Bilingual } from '../../data/types';

const sample: Bilingual = { en: 'Hello', sr_lat: 'Zdravo', sr_cyr: 'Здраво', tr: 'Merhaba' };

describe('i18n helpers', () => {
  describe('pick', () => {
    it('picks English by default', () => {
      expect(pick(sample, { locale: 'en', script: 'Latn' })).toBe('Hello');
    });

    it('picks Serbian Latin', () => {
      expect(pick(sample, { locale: 'sr', script: 'Latn' })).toBe('Zdravo');
    });

    it('picks Serbian Cyrillic', () => {
      expect(pick(sample, { locale: 'sr', script: 'Cyrl' })).toBe('Здраво');
    });

    it('falls back to English when sr field is empty', () => {
      const partial: Bilingual = { en: 'Only', sr_lat: '', sr_cyr: '', tr: '' };
      expect(pick(partial, { locale: 'sr', script: 'Latn' })).toBe('Only');
    });

    it('picks Turkish when locale is tr', () => {
      expect(pick(sample, { locale: 'tr', script: 'Latn' })).toBe('Merhaba');
    });

    it('falls back to English when tr field is empty', () => {
      const partial: Bilingual = { en: 'Only', sr_lat: '', sr_cyr: '', tr: '' };
      expect(pick(partial, { locale: 'tr', script: 'Latn' })).toBe('Only');
    });
  });

  describe('defaultLocaleFromBrowser', () => {
    it('returns sr-Latn when navigator language starts with sr', () => {
      expect(defaultLocaleFromBrowser('sr-RS')).toEqual({ locale: 'sr', script: 'Latn' });
    });

    it('returns en-Latn for everything else', () => {
      expect(defaultLocaleFromBrowser('en-US')).toEqual({ locale: 'en', script: 'Latn' });
      expect(defaultLocaleFromBrowser('de-DE')).toEqual({ locale: 'en', script: 'Latn' });
    });

    it('handles undefined gracefully', () => {
      expect(defaultLocaleFromBrowser(undefined)).toEqual({ locale: 'en', script: 'Latn' });
    });

    it('returns tr-Latn when navigator language starts with tr', () => {
      expect(defaultLocaleFromBrowser('tr-TR')).toEqual({ locale: 'tr', script: 'Latn' });
      expect(defaultLocaleFromBrowser('tr')).toEqual({ locale: 'tr', script: 'Latn' });
    });
  });
});
