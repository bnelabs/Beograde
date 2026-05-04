import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    // Mock localStorage for Vitest
    localStorageMock = {};
    (window as any).localStorage = {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
      key: (index: number) => Object.keys(localStorageMock)[index] ?? null,
      length: Object.keys(localStorageMock).length,
    } as unknown as Storage;
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

  it('hides Cyrillic in Phase 1a', () => {
    const svc = TestBed.inject(I18nService);
    expect(svc.cyrillicEnabled()).toBe(false);
  });
});
