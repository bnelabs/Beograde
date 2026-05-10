import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-distance-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dp" role="progressbar"
         [attr.aria-valuemin]="0"
         [attr.aria-valuemax]="totalMeters()"
         [attr.aria-valuenow]="cappedWalked()">
      <div class="dp-row">
        <span class="dp-label">{{ formatMeters(cappedWalked()) }} of {{ formatMeters(totalMeters()) }}</span>
        <span class="dp-pct">{{ pct() }}%</span>
      </div>
      <div class="dp-track">
        <div class="dp-fill" [style.width.%]="pct()"></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dp { font-feature-settings: "tnum"; }
    .dp-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-2); margin-bottom: 4px; }
    .dp-pct { color: var(--accent); font-weight: 700; }
    .dp-track { height: 4px; background: rgba(0,0,0,0.08); border-radius: 2px; overflow: hidden; }
    .dp-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 240ms ease; }
  `],
})
export class DistanceProgressComponent {
  walkedMeters = input<number>(0);
  totalMeters = input<number>(1);

  readonly cappedWalked = computed(() => Math.min(this.walkedMeters(), this.totalMeters()));
  readonly pct = computed(() => Math.round((this.cappedWalked() / Math.max(this.totalMeters(), 1)) * 100));

  formatMeters(m: number): string {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }
}
