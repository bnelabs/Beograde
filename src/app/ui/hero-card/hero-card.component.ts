import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ImageAsset } from '../../data/types';
import { AppImageComponent } from '../app-image/app-image.component';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  imports: [AppImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="hero">
      @if (asset(); as a) {
        <app-image class="hero-img" [asset]="a" [alt]="title()" [eager]="true" [showCredit]="false" ratio="16 / 9" />
        <div class="hero-scrim" aria-hidden="true"></div>
      } @else {
        <div class="hero-bg"></div>
      }
      <div class="hero-fg">
        <div class="hero-eyebrow">{{ eyebrow() }}</div>
        <h2 class="hero-title">{{ title() }}</h2>
        <p class="hero-meta">{{ meta() }}</p>
      </div>
    </article>
  `,
  styles: [`
    .hero {
      position: relative;
      border-radius: var(--radius-card-lg);
      overflow: hidden;
      aspect-ratio: 16 / 9;
      box-shadow: var(--shadow-card);
      color: white;
    }
    .hero-bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(80% 80% at 80% 20%, rgba(255,255,255,0.35), transparent 60%),
        linear-gradient(135deg, var(--river) 0%, var(--accent) 60%, var(--fortress-deep) 100%);
    }
    .hero-img { position: absolute; inset: 0; }
    .hero-scrim {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.6) 100%);
      pointer-events: none;
    }
    .hero-fg {
      position: relative;
      z-index: 1;
      padding: 18px 18px 16px;
      height: 100%;
      display: flex; flex-direction: column; justify-content: space-between;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    .hero-eyebrow { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.92; }
    .hero-title { font-size: 22px; line-height: 1.05; margin: 6px 0 0; max-width: 80%; }
    .hero-meta { font-size: 12px; opacity: 0.92; margin: 0; }
  `],
})
export class HeroCardComponent {
  eyebrow = input.required<string>();
  title = input.required<string>();
  meta = input<string>('');
  asset = input<ImageAsset | undefined>(undefined);
}
