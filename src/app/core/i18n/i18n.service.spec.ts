import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe('I18nService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initialises to browser locale', () => {
    const svc = TestBed.inject(I18nService);
    expect(svc.locale().locale).toBeDefined();
    expect(svc.locale().script).toBeDefined();
  });

  it('persists locale changes', () => {
    const svc = TestBed.inject(I18nService);
    svc.setLocale({ locale: 'sr', script: 'Latn' });
    expect(svc.locale()).toEqual({ locale: 'sr', script: 'Latn' });
    expect(localStorage.getItem('beograde:locale')).toContain('sr');
  });

  it('persists Cyrillic script when cyrillic is enabled', () => {
    const svc = TestBed.inject(I18nService);
    svc.setLocale({ locale: 'sr', script: 'Cyrl' });
    expect(svc.locale().script).toBe('Cyrl');
  });
});
