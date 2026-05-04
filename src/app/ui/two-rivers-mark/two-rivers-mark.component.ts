import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-two-rivers-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 4 C 12 14, 12 18, 16 28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M28 4 C 20 14, 20 18, 16 28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="16" cy="28" r="2" fill="currentColor"/>
    </svg>
  `,
})
export class TwoRiversMarkComponent {
  size = input<number>(24);
}
