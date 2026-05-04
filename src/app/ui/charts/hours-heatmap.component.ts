import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-hours-heatmap',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="hm" [attr.aria-label]="ariaLabel()">
      <div class="hm-grid" role="img">
        @for (row of grid(); let dayIdx = $index; track dayIdx) {
          <div class="hm-row">
            <span class="hm-day">{{ dayLabel(dayIdx) }}</span>
            @for (cell of row; let hourIdx = $index; track hourIdx) {
              <span class="hm-cell"
                    [ngClass]="{
                      'is-open': cell,
                      'is-now': dayIdx === todayWeekday() && hourIdx === currentHour()
                    }"
                    [title]="dayLabel(dayIdx) + ' ' + hourIdx + ':00 — ' + (cell ? 'open' : 'closed')"></span>
            }
          </div>
        }
      </div>
      <div class="hm-axis" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </figure>
  `,
  styles: [`
    :host { display: block; font-feature-settings: "tnum"; }
    .hm-grid { display: flex; flex-direction: column; gap: 3px; }
    .hm-row { display: grid; grid-template-columns: 32px repeat(24, 1fr); gap: 2px; align-items: center; }
    .hm-day { font-size: 10px; color: var(--ink-3); font-weight: 600; }
    .hm-cell {
      height: 14px;
      background: rgba(0,0,0,0.05);
      border-radius: 2px;
      transition: background 120ms;
    }
    .hm-cell.is-open { background: var(--accent-soft); }
    .hm-cell.is-now { outline: 2px solid var(--accent); outline-offset: 1px; }
    .hm-axis {
      display: grid;
      grid-template-columns: 32px repeat(4, 1fr) 0;
      margin-top: 6px;
      font-size: 9px;
      color: var(--ink-3);
    }
    .hm-axis span:first-child { grid-column: 1; }
    .hm-axis span:nth-child(2) { grid-column: 2 / 8; }
    .hm-axis span:nth-child(3) { grid-column: 8 / 14; }
    .hm-axis span:nth-child(4) { grid-column: 14 / 20; }
    .hm-axis span:nth-child(5) { grid-column: 20 / 26; text-align: right; }
  `],
})
export class HoursHeatmapComponent {
  /** 7×24 boolean grid; index 0 = Sunday. Computed by HoursService.weeklyGrid. */
  grid = input.required<boolean[][]>();

  readonly todayWeekday = computed(() => new Date().getDay());
  readonly currentHour = computed(() => new Date().getHours());

  dayLabel(idx: number): string {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx];
  }

  readonly ariaLabel = computed(() => {
    const open = this.grid().flat().filter(Boolean).length;
    return `Hours heatmap: open ${open} hours per typical week`;
  });
}
