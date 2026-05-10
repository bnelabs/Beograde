import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getPoi, CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { HoursService } from '../../core/hours/hours.service';
import { SavedService } from '../../core/saved/saved.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { ChipComponent } from '../../ui/chip/chip.component';
import { HoursHeatmapComponent } from '../../ui/charts/hours-heatmap.component';
import { AppImageComponent } from '../../ui/app-image/app-image.component';
import { formatDistance, walkingMinutes } from '../../data/distance';
import { StringsService } from '../../core/i18n/strings.service';

@Component({
  selector: 'app-poi-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, ChipComponent, HoursHeatmapComponent, AppImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poi-detail.component.html',
  styleUrl: './poi-detail.component.css',
})
export class PoiDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  private hours = inject(HoursService);
  private readonly strings = inject(StringsService);
  protected readonly geo = inject(GeolocationService);
  protected readonly saved = inject(SavedService);

  protected readonly labels = CATEGORY_LABELS;
  protected readonly icons = CATEGORY_ICONS;

  private idSig = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly poi = computed(() => {
    const id = this.idSig().get('id');
    return id ? getPoi(id) : undefined;
  });

  protected readonly heroImage = computed(() => this.poi()?.images?.[0]);
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
