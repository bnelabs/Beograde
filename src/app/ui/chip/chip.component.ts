import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

type ChipVariant =
  | 'filter-active'
  | 'filter-idle'
  | 'verified'      // green check (Wikipedia / OSM / Official)
  | 'editor-pick'   // accent-soft (high editorial confidence)
  | 'reviews'       // outline, volume signal
  | 'open-now'      // good
  | 'closed'        // neutral
  | 'transit';      // tram-red

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [ngClass]="'chip-' + variant()" role="status">
      <ng-content />
    </span>
  `,
  styles: [`
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 4px 9px;
      border-radius: var(--radius-pill);
      white-space: nowrap;
      line-height: 1;
    }
    .chip-filter-active { background: var(--ink); color: white; }
    .chip-filter-idle { background: transparent; color: var(--ink-2); border: 1px solid rgba(0,0,0,0.1); }
    .chip-verified { background: var(--good-soft); color: var(--good); }
    .chip-editor-pick { background: var(--accent-soft); color: var(--accent); }
    .chip-reviews { background: transparent; color: var(--ink-2); border: 1px solid rgba(0,0,0,0.1); }
    .chip-open-now { background: var(--good-soft); color: var(--good); }
    .chip-closed { background: rgba(0,0,0,0.05); color: var(--ink-2); }
    .chip-transit { background: var(--transit-red-soft); color: var(--transit-red); }
  `],
})
export class ChipComponent {
  variant = input.required<ChipVariant>();
}
