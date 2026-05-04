import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

type Variant = 'plain' | 'elevated' | 'concrete';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [ngClass]="'card-' + variant()">
      <ng-content />
    </div>
  `,
  styles: [`
    .card {
      background: var(--surface);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      transition: transform 120ms ease;
    }
    .card-elevated { border-radius: var(--radius-card-lg); }
    .card-concrete {
      background:
        repeating-linear-gradient(135deg, transparent 0 18px, rgba(0,0,0,0.02) 18px 19px),
        var(--concrete);
      color: white;
    }
    .card:active { transform: scale(0.99); }
  `],
})
export class CardComponent {
  variant = input<Variant>('plain');
}
