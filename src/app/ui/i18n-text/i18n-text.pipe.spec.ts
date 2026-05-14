import { TestBed } from '@angular/core/testing';
import { I18nTextPipe } from './i18n-text.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

describe('I18nTextPipe', () => {
  let pipe: I18nTextPipe;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
    pipe = TestBed.runInInjectionContext(() => new I18nTextPipe());
  });

  it('returns English by default', () => {
    i18n.setLocale({ locale: 'en', script: 'Latn' });
    expect(pipe.transform({ en: 'Hi', sr_lat: 'Zdravo', sr_cyr: '', tr: '' })).toBe('Hi');
  });

  it('returns Serbian Latin when locale is sr', () => {
    i18n.setLocale({ locale: 'sr', script: 'Latn' });
    expect(pipe.transform({ en: 'Hi', sr_lat: 'Zdravo', sr_cyr: '', tr: '' })).toBe('Zdravo');
  });

  it('returns empty string for null/undefined inputs', () => {
    expect(pipe.transform(null as never)).toBe('');
    expect(pipe.transform(undefined as never)).toBe('');
  });
});
