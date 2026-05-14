import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import type { BudgetTier, PoiActivity } from '../../data/types';
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

  protected readonly icons = CATEGORY_ICONS;

  private idSig = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly poi = computed(() => {
    const id = this.idSig().get('id');
    return id ? getPoi(id) : undefined;
  });

  protected readonly images = computed(() => this.poi()?.images ?? []);
  /** Per-photo credit is shown in the gallery lightbox; this list backs the collapsed footer fallback. */
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
  /** Second hero image, surfaced as an in-body break to keep visuals on every screen. */
  protected readonly inlineImage = computed(() => this.images()[1] ?? null);

  protected readonly distance = computed(() => {
    const p = this.poi();
    if (!p) return null;
    return this.proximity.distanceTo(p);
  });

  protected readonly t = this.strings.t;

  /** Open / closed evaluation and its "until" boundary, computed every render. */
  protected readonly hoursStatus = computed(() => {
    const p = this.poi();
    if (!p?.hours) return null;
    return this.hours.isOpenAt(p.hours.raw, new Date());
  });

  protected readonly openState = computed(() => this.hoursStatus()?.state ?? null);

  protected readonly weeklyGrid = computed(() => {
    const p = this.poi();
    if (!p?.hours) return null;
    return this.hours.weeklyGrid(p.hours.raw);
  });

  /** UI toggle for the full-week heatmap; collapsed by default to keep the screen clean. */
  protected readonly weekExpanded = signal(false);
  toggleWeek(): void {
    this.weekExpanded.update(v => !v);
  }

  /**
   * Compact status line: "Open · until 22:00" or "Closed · opens Tue 09:00".
   * Day prefix is added when the boundary crosses midnight to avoid the
   * "Closes at 02:00" ambiguity flagged by review.
   */
  protected readonly hoursStatusLabel = computed(() => {
    const p = this.poi();
    const status = this.hoursStatus();
    if (!p?.hours) return null;
    if (!status || status.state === 'unknown') return this.t().poi.hours_unknown;

    const until = status.until;
    if (!until) {
      return status.state === 'open' ? this.t().poi.open_now : this.t().poi.closed;
    }

    const now = new Date();
    const sameDay =
      until.getFullYear() === now.getFullYear() &&
      until.getMonth() === now.getMonth() &&
      until.getDate() === now.getDate();
    const time = `${String(until.getHours()).padStart(2, '0')}:${String(until.getMinutes()).padStart(2, '0')}`;
    const dayPrefix = sameDay
      ? ''
      : `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][until.getDay()]} `;

    const key = status.state === 'open' ? 'open_until' : 'closed_opens';
    return this.t().poi[key].replace('{time}', dayPrefix + time);
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

  /**
   * Map of POI category → set of three Material symbol icons used for the
   * highlight cards in round-robin. Keeps highlight cards visually distinct
   * without needing per-highlight icon authoring.
   */
  private readonly HIGHLIGHT_ICONS: Record<string, string[]> = {
    sight: ['account_balance', 'photo_camera', 'history_edu'],
    cuisine: ['restaurant', 'local_dining', 'ramen_dining'],
    nightlife: ['nightlife', 'local_bar', 'music_note'],
    cafe: ['local_cafe', 'coffee', 'bakery_dining'],
    museum: ['museum', 'auto_stories', 'palette'],
    viewpoint: ['visibility', 'landscape', 'binoculars'],
    park: ['park', 'forest', 'nature_people'],
  };

  iconForHighlight(index: number): string {
    const cat = this.poi()?.category ?? 'sight';
    const set = this.HIGHLIGHT_ICONS[cat] ?? this.HIGHLIGHT_ICONS['sight'];
    return set[index % set.length];
  }

  /** Cycle gallery images across highlight cards so each card carries a photo backdrop. */
  imageForHighlight(index: number) {
    const imgs = this.images();
    if (imgs.length === 0) return null;
    return imgs[index % imgs.length];
  }

  /** Cycle gallery images across activity cards. Offsets by +highlights.length so
   * activities don't reuse the exact same image as the highlight above them. */
  imageForActivity(index: number) {
    const imgs = this.images();
    if (imgs.length === 0) return null;
    const offset = this.poi()?.highlights?.length ?? 0;
    return imgs[(index + offset) % imgs.length];
  }

  /** 4-dot budget bar: 1 dot = Free, 2 = Light, 3 = Mid, 4 = Premium. */
  budgetDots(tier: BudgetTier): boolean[] {
    const filled = tier === 'free' ? 1 : tier === 'low' ? 2 : tier === 'mid' ? 3 : 4;
    return [0, 1, 2, 3].map(i => i < filled);
  }

  /** Map pricing tier (€ / €€ / €€€) to the 4-dot budget scale. */
  pricingDots(tier: '€' | '€€' | '€€€'): boolean[] {
    const filled = tier === '€' ? 1 : tier === '€€' ? 2 : 3;
    return [0, 1, 2, 3].map(i => i < filled);
  }

  /** Localised label for an activity's intensity rating. */
  intensityLabel(activity: PoiActivity): string {
    const poi = this.t().poi;
    switch (activity.intensity) {
      case 'easy': return poi.intensity_easy;
      case 'moderate': return poi.intensity_moderate;
      case 'active': return poi.intensity_active;
    }
  }

  /** Localised label for a budget tier. */
  budgetLabel(tier: BudgetTier): string {
    const poi = this.t().poi;
    switch (tier) {
      case 'free': return poi.budget_free;
      case 'low': return poi.budget_low;
      case 'mid': return poi.budget_mid;
      case 'high': return poi.budget_high;
    }
  }

  /** Human-readable duration: "30 min" or "1 h 30 min" / "2 h". */
  formatDuration(min: number): string {
    if (min < 60) return this.t().poi.duration_min.replace('{n}', min.toString());
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hStr = this.t().poi.duration_hr.replace('{n}', h.toString());
    if (m === 0) return hStr;
    return `${hStr} ${this.t().poi.duration_min.replace('{n}', m.toString())}`;
  }

  /** 7-dot busy strip: one dot per weekday (Mon..Sun in JS order Sun=0).
   * "filled" = has any open block that day; "today" = highlighted. */
  protected readonly weeklyBusyDots = computed(() => {
    const grid = this.weeklyGrid();
    if (!grid) return null;
    const todayIdx = new Date().getDay();
    // grid is 7 rows × 24 cols of booleans. Order: 0=Sun..6=Sat.
    return grid.map((row, dayIdx) => ({
      open: row.some(Boolean),
      isToday: dayIdx === todayIdx,
      dayLabel: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayIdx],
    }));
  });

  protected fmtDistance = formatDistance;
  protected fmtWalk(meters: number): string {
    return this.t().map.min_walk.replace('{n}', walkingMinutes(meters).toString());
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

  openInMaps(): void {
    const p = this.poi();
    if (!p) return;
    const query = encodeURIComponent(`${p.name.en} ${p.lat},${p.lng}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
