import { Injectable, signal } from '@angular/core';
import { defaultLocaleFromBrowser } from './i18n';
import { ResolvedLocale } from './i18n.types';

const STORAGE_KEY = 'beograde:locale';
/** Phase 1b flag: Cyrillic UI toggle is active. */
const CYRILLIC_ENABLED = true;

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<ResolvedLocale>(this.load());
  readonly cyrillicEnabled = signal(CYRILLIC_ENABLED);

  setLocale(next: ResolvedLocale): void {
    this.locale.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode etc. — silent.
    }
  }

  private load(): ResolvedLocale {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ResolvedLocale;
        if (parsed?.locale) return parsed;
      }
    } catch {
      // Fall through.
    }
    return defaultLocaleFromBrowser(typeof navigator !== 'undefined' ? navigator.language : undefined);
  }
}
