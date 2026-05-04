import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="hero">
      <div class="hero-bg"></div>
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
    .hero-fg { position: relative; z-index: 1; padding: 18px 18px 16px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
    .hero-eyebrow { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.92; }
    .hero-title { font-size: 22px; line-height: 1.05; margin: 6px 0 0; max-width: 80%; }
    .hero-meta { font-size: 12px; opacity: 0.92; margin: 0; }
  `],
})
export class HeroCardComponent {
  eyebrow = input.required<string>();
  title = input.required<string>();
  meta = input<string>('');
}
