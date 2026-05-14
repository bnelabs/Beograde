import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageAsset } from '../../data/types';
import { buildSrcset } from '../../data/image-srcset';

/**
 * Full-bleed photo gallery with horizontal scroll-snap paging and a tap-to-open
 * fullscreen lightbox. Photos are shown contained (no aggressive crop) on top
 * of a blurred backdrop, so users see the entire image.
 */
@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-gallery.component.html',
  styleUrl: './photo-gallery.component.css',
})
export class PhotoGalleryComponent implements AfterViewInit {
  assets = input<ImageAsset[]>([]);
  alt = input<string>('');
  fallbackIcon = input<string | undefined>(undefined);

  protected readonly currentIndex = signal(0);
  protected readonly lightboxOpen = signal(false);
  protected readonly lightboxIndex = signal(0);

  @ViewChild('lbScroller') lbScroller?: ElementRef<HTMLDivElement>;

  protected readonly currentCredit = computed(
    () => this.assets()[this.lightboxIndex()]?.credit,
  );
  protected readonly currentSource = computed(
    () => this.assets()[this.lightboxIndex()]?.source,
  );

  ngAfterViewInit(): void {
    /* no-op; scroll position is set when the lightbox opens */
  }

  srcsetFor(a: ImageAsset): string {
    return buildSrcset(a);
  }

  onScroll(e: Event): void {
    const el = e.target as HTMLElement;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== this.currentIndex()) this.currentIndex.set(idx);
  }

  onLightboxScroll(e: Event): void {
    const el = e.target as HTMLElement;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== this.lightboxIndex()) this.lightboxIndex.set(idx);
  }

  openLightbox(i: number): void {
    this.lightboxIndex.set(i);
    this.lightboxOpen.set(true);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    queueMicrotask(() => {
      const el = this.lbScroller?.nativeElement;
      if (el) el.scrollLeft = el.clientWidth * i;
    });
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxOpen()) this.closeLightbox();
  }
}
