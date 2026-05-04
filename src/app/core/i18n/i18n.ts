import type { Bilingual } from '../../data/types';
import { DEFAULT_LOCALE, ResolvedLocale } from './i18n.types';

export function pick(value: Bilingual, locale: ResolvedLocale): string {
  if (locale.locale === 'sr') {
    if (locale.script === 'Cyrl' && value.sr_cyr) return value.sr_cyr;
    if (value.sr_lat) return value.sr_lat;
  }
  return value.en;
}

export function defaultLocaleFromBrowser(lang: string | undefined): ResolvedLocale {
  if (!lang) return DEFAULT_LOCALE;
  if (lang.toLowerCase().startsWith('sr')) return { locale: 'sr', script: 'Latn' };
  return DEFAULT_LOCALE;
}
