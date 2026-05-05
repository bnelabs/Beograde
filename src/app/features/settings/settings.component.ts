import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilePackService } from '../../core/tile-pack.service';
import { GeolocationService } from '../../core/geolocation.service';
import { PwaInstallService } from '../../core/pwa-install.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { StringsService } from '../../core/i18n/strings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  protected readonly tilePack = inject(TilePackService);
  protected readonly geo = inject(GeolocationService);
  protected readonly pwa = inject(PwaInstallService);
  protected readonly i18n = inject(I18nService);

  protected readonly confirmingClear = signal(false);
  private readonly strings = inject(StringsService);
  protected readonly t = this.strings.t;

  protected readonly tilePackSize = computed(() => {
    const meta = this.tilePack.meta();
    if (!meta) return null;
    return this.formatBytes(meta.bytes);
  });

  protected readonly tilePackAge = computed(() => {
    const meta = this.tilePack.meta();
    if (!meta) return null;
    const days = Math.floor((Date.now() - meta.storedAt) / (1000 * 60 * 60 * 24));
    if (days === 0) return this.t().settings.downloaded_today;
    if (days === 1) return this.t().settings.downloaded_yesterday;
    return this.t().settings.downloaded_days.replace('{n}', days.toString());
  });

  async clearPack(): Promise<void> {
    this.confirmingClear.set(false);
    await this.tilePack.clear();
  }

  async install(): Promise<void> {
    await this.pwa.promptInstall();
  }

  setLocale(loc: 'en' | 'sr'): void {
    this.i18n.setLocale({ locale: loc, script: 'Latn' });
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
