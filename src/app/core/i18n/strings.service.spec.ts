import { TestBed } from '@angular/core/testing';
import { StringsService } from './strings.service';
import { I18nService } from './i18n.service';

describe('StringsService', () => {
  let svc: StringsService;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(StringsService);
    i18n = TestBed.inject(I18nService);
  });

  it('returns EN when locale is en', () => {
    i18n.locale.set({ locale: 'en', script: 'Latn' });
    expect(svc.t().tabs.home).toBe('Home');
  });

  it('returns SR-Latn when locale is sr/Latn', () => {
    i18n.locale.set({ locale: 'sr', script: 'Latn' });
    expect(svc.t().tabs.home).toBe('Početna');
  });

  it('returns SR-Cyrl when locale is sr/Cyrl AND cyrillicEnabled is true', () => {
    // We bypass setLocale here because it clamps Cyrl→Latn while CYRILLIC_ENABLED
    // is still the Phase-1a default. Setting the signal directly exercises the
    // StringsService branch we're testing — Task 12 flips the constant later.
    i18n.cyrillicEnabled.set(true);
    i18n.locale.set({ locale: 'sr', script: 'Cyrl' });
    expect(svc.t().tabs.home).toBe('Почетна');
  });

  it('falls back to SR-Latn when script is Cyrl but cyrillicEnabled is false', () => {
    i18n.cyrillicEnabled.set(false);
    i18n.locale.set({ locale: 'sr', script: 'Cyrl' });
    expect(svc.t().tabs.home).toBe('Početna');
  });
});
