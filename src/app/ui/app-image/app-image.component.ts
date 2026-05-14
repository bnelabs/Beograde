import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ImageAsset } from '../../data/types';
import { buildSrcset, fallbackSizes } from '../../data/image-srcset';

/**
 * Renders an ImageAsset with a base64 LQIP blur-up, derived srcset, and an
 * optional icon fallback when no asset is available. Used on POI detail hero,
 * Home tile thumbs, and Home Today's-pick hero card.
 */
@Component({
  selector: 'app-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-image"
         [style.aspectRatio]="ratio()"
         [style.backgroundImage]="bg()">
      @if (asset(); as a) {
        <img class="app-image-img"
             [src]="a.src"
             [srcset]="srcset()"
             [sizes]="sizes()"
             [width]="a.width" [height]="a.height"
             [alt]="alt()"
             [attr.loading]="eager() ? null : 'lazy'"
             decoding="async" />
        @if (showCredit()) {
          <span class="app-image-credit">{{ a.credit }}</span>
        }
      } @else if (fallbackIcon(); as icon) {
        <span class="material-symbols-outlined app-image-fallback" aria-hidden="true">{{ icon }}</span>
      }
    </div>
  `,
  styles: [`
    .app-image {
      position: relative;
      width: 100%;
      overflow: hidden;
      background-color: var(--surface-2, #e7e9ee);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      border-radius: inherit;
    }
    .app-image-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center 40%;
    }
    .app-image-credit {
      position: absolute; right: 8px; bottom: 6px;
      font-size: 10px; line-height: 1.2;
      color: white;
      background: rgba(0,0,0,0.45);
      padding: 2px 6px; border-radius: 3px;
      max-width: 70%;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      z-index: 2;
    }
    .app-image-fallback {
      position: absolute; inset: 0;
      display: grid; place-items: center;
      font-size: 36px;
      color: var(--text-muted, #5b6470);
      opacity: 0.7;
    }
  `],
})
export class AppImageComponent {
  asset = input<ImageAsset | undefined>(undefined);
  alt = input<string>('');
  eager = input<boolean>(false);
  ratio = input<string>('16 / 9');
  fallbackIcon = input<string | undefined>(undefined);
  kind = input<'hero' | 'tile'>('hero');
  showCredit = input<boolean>(true);

  srcset = computed(() => {
    const a = this.asset();
    return a ? buildSrcset(a) : '';
  });
  sizes = computed(() => fallbackSizes(this.kind()));
  bg = computed(() => {
    const a = this.asset();
    return a ? `url("${a.lqip}")` : '';
  });
}
