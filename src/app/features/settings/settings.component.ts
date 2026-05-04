import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilePackService } from '../../core/tile-pack.service';
import { GeolocationService } from '../../core/geolocation.service';
import { PwaInstallService } from '../../core/pwa-install.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  protected readonly tilePack = inject(TilePackService);
  protected readonly geo = inject(GeolocationService);
  protected readonly pwa = inject(PwaInstallService);

  protected readonly confirmingClear = signal(false);

  protected readonly tilePackSize = computed(() => {
    const meta = this.tilePack.meta();
    if (!meta) return null;
    return this.formatBytes(meta.bytes);
  });

  protected readonly tilePackAge = computed(() => {
    const meta = this.tilePack.meta();
    if (!meta) return null;
    const days = Math.floor((Date.now() - meta.storedAt) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  });

  async clearPack(): Promise<void> {
    this.confirmingClear.set(false);
    await this.tilePack.clear();
  }

  async install(): Promise<void> {
    await this.pwa.promptInstall();
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
