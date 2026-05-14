import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { TilePackService } from '../../core/tile-pack.service';
import { GeolocationService } from '../../core/geolocation.service';
import { PwaInstallService } from '../../core/pwa-install.service';

class StubTilePackService {
  meta = signal(null);
  status = signal('idle');
  async clear() {}
  async download() {}
}
class StubGeolocationService {
  position = signal(null);
  permission = signal('prompt');
  isWatching = signal(false);
  start() {}
  stop() {}
}
class StubPwaInstallService {
  canPrompt = signal(false);
  isStandalone = signal(false);
  isIos = signal(false);
  async promptInstall() {}
}

describe('SettingsComponent locale cycle', () => {
  let component: SettingsComponent;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: TilePackService, useClass: StubTilePackService },
        { provide: GeolocationService, useClass: StubGeolocationService },
        { provide: PwaInstallService, useClass: StubPwaInstallService },
      ],
    });
    const fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    i18n = TestBed.inject(I18nService);
    i18n.setLocale({ locale: 'en', script: 'Latn' });
  });

  it('cycles en → sr-Latn → sr-Cyrl → tr → en and updates localeLabel for each step', () => {
    expect(i18n.locale()).toEqual({ locale: 'en', script: 'Latn' });
    expect(component['localeLabel']()).toBe('English');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'sr', script: 'Latn' });
    expect(component['localeLabel']()).toBe('Srpski');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'sr', script: 'Cyrl' });
    expect(component['localeLabel']()).toBe('Српски (ћирилица)');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'tr', script: 'Latn' });
    expect(component['localeLabel']()).toBe('Türkçe');

    component.cycleLocale();
    expect(i18n.locale()).toEqual({ locale: 'en', script: 'Latn' });
    expect(component['localeLabel']()).toBe('English');
  });

  it('renders the Turkish localeLabel when started directly in tr', () => {
    i18n.setLocale({ locale: 'tr', script: 'Latn' });
    expect(component['localeLabel']()).toBe('Türkçe');
  });
});
