import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getPoi, CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { HoursService } from '../../core/hours/hours.service';
import { SavedService } from '../../core/saved/saved.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { ChipComponent } from '../../ui/chip/chip.component';
import { HoursHeatmapComponent } from '../../ui/charts/hours-heatmap.component';
import { PhotoGalleryComponent } from '../../ui/photo-gallery/photo-gallery.component';
import { formatDistance, walkingMinutes } from '../../data/distance';
import { StringsService } from '../../core/i18n/strings.service';

@Component({
  selector: 'app-poi-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, ChipComponent, HoursHeatmapComponent, PhotoGalleryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poi-detail.component.html',
  styleUrl: './poi-detail.component.css',
})
export class PoiDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  private hours = inject(HoursService);
  private readonly strings = inject(StringsService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  protected readonly geo = inject(GeolocationService);
  protected readonly saved = inject(SavedService);

  protected readonly labels = CATEGORY_LABELS;
  protected readonly icons = CATEGORY_ICONS;

  private idSig = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly poi = computed(() => {
    const id = this.idSig().get('id');
    return id ? getPoi(id) : undefined;
  });

  protected readonly images = computed(() => this.poi()?.images ?? []);
  protected readonly heroImage = computed(() => this.images()[0]);
  /** Unique credit/source pairs across all photos — shown at the bottom for license compliance. */
  protected readonly uniqueCredits = computed(() => {
    const seen = new Set<string>();
    const out: { credit: string; source?: string }[] = [];
    for (const img of this.images()) {
      const key = `${img.credit}|${img.source ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ credit: img.credit, source: img.source });
    }
    return out;
  });
  protected readonly heroIcon = computed(() => {
    const p = this.poi();
    return p ? CATEGORY_ICONS[p.category] : undefined;
  });

  protected readonly distance = computed(() => {
    const p = this.poi();
    if (!p) return null;
    return this.proximity.distanceTo(p);
  });

  protected readonly t = this.strings.t;

  protected readonly openState = computed(() => {
    const p = this.poi();
    if (!p?.hours) return null;
    return this.hours.isOpenAt(p.hours.raw, new Date()).state;
  });

  protected readonly weeklyGrid = computed(() => {
    const p = this.poi();
    if (!p?.hours) return null;
    return this.hours.weeklyGrid(p.hours.raw);
  });

  /** EDITOR'S PICK chip rule: high editorial confidence AND fewer than two automated checks pass. */
  protected readonly showEditorPick = computed(() => {
    const p = this.poi();
    if (!p) return false;
    if (p.editorialConfidence !== 'high') return false;
    const passes = Object.values(p.reliability.checks).filter(Boolean).length;
    return passes < 2;
  });

  protected readonly googleSource = computed(() =>
    this.poi()?.sources.find(s => s.kind === 'google-places') as { reviewCount: number; rating: number } | undefined
  );

  protected fmtDistance = formatDistance;
  protected fmtWalk(meters: number): string {
    return `${walkingMinutes(meters)} min walk`;
  }

  formatVerified(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  goBack(): void {
    const history = (typeof window !== 'undefined' && window.history?.length) || 0;
    if (history > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/map']);
    }
  }

  toggleSave(): void {
    const p = this.poi();
    if (!p) return;
    if (this.saved.isSaved(p.id)) {
      void this.saved.remove(p.id);
    } else {
      void this.saved.add(p.id);
    }
  }
}
