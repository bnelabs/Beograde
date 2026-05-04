import type { Bilingual, Locale, Script } from '../../data/types';

export type ResolvedLocale = { locale: Locale; script: Script };
export type { Bilingual, Locale, Script };

export const DEFAULT_LOCALE: ResolvedLocale = { locale: 'en', script: 'Latn' };
