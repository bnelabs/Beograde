import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getItinerary } from '../../data/itineraries';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { ItineraryProgressService } from '../../core/itinerary-progress/itinerary-progress.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { DistanceProgressComponent } from '../../ui/charts/distance-progress.component';
import { formatDistance, haversineMeters, walkingMinutes } from '../../data/distance';
import { StringsService } from '../../core/i18n/strings.service';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, DistanceProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-detail.component.html',
  styleUrl: './itinerary-detail.component.css',
})
export class ItineraryDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  private readonly strings = inject(StringsService);
  protected readonly geo = inject(GeolocationService);
  protected readonly progress = inject(ItineraryProgressService);
  protected readonly icons = CATEGORY_ICONS;
  protected fmtDistance = formatDistance;

  private idSig = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly t = this.strings.t;

  protected readonly itinerary = computed(() => {
    const id = this.idSig().get('id');
    return id ? getItinerary(id) : undefined;
  });

  protected readonly enrichedStops = computed(() => {
    const it = this.itinerary();
    if (!it) return [];
    const reachedIds = this.progress.progressFor(it.id)?.reachedStopIds ?? [];
    const enriched = it.stops.map((s) => {
      const poi = getPoi(s.poiId);
      const distance = poi ? this.proximity.distanceTo(poi) : null;
      const reached = reachedIds.includes(s.poiId) || (distance !== null && distance <= 100);
      return { stop: s, poi, distance, reached, legMeters: 0, legMinutes: 0, legIsTransit: false };
    });
    for (let i = 1; i < enriched.length; i++) {
      const prev = enriched[i - 1].poi;
      const curr = enriched[i].poi;
      if (prev && curr) {
        const m = haversineMeters(prev, curr);
        enriched[i].legMeters = m;
        enriched[i].legMinutes = walkingMinutes(m);
        enriched[i].legIsTransit = m > 3000;
      }
    }
    return enriched;
  });

  /** Index of the next not-yet-reached stop. Returns enrichedStops.length when complete. */
  protected readonly nextStopIndex = computed(() => {
    const stops = this.enrichedStops();
    const idx = stops.findIndex(s => !s.reached);
    return idx === -1 ? stops.length : idx;
  });

  protected readonly isComplete = computed(() => {
    const stops = this.enrichedStops();
    return stops.length > 0 && this.nextStopIndex() === stops.length;
  });

  /** Total distance in meters across all legs (used by progress bar). */
  protected readonly totalMeters = computed(() => {
    const stops = this.enrichedStops();
    let total = 0;
    for (let i = 1; i < stops.length; i++) total += stops[i].legMeters;
    return Math.max(total, 1);
  });

  /** Total walking-only distance — excludes long transit legs (>3 km). */
  protected readonly totalWalkMeters = computed(() => {
    const stops = this.enrichedStops();
    let total = 0;
    for (let i = 1; i < stops.length; i++) {
      if (!stops[i].legIsTransit) total += stops[i].legMeters;
    }
    return total;
  });

  /** Total walking minutes summed across walking legs only. */
  protected readonly totalWalkMinutes = computed(() => walkingMinutes(this.totalWalkMeters()));

  /** Whether the route has any transit (>3 km) legs. */
  protected readonly hasTransitLegs = computed(() =>
    this.enrichedStops().some(s => s.legIsTransit),
  );

  protected readonly walkedMeters = computed(() => {
    const stops = this.enrichedStops();
    let walked = 0;
    for (let i = 0; i + 1 < stops.length; i++) {
      if (!stops[i].reached) break;
      const a = stops[i].poi, b = stops[i + 1].poi;
      if (a && b) walked += haversineMeters(a, b);
    }
    return walked;
  });

  hours(min: number): string {
    const poi = this.t().poi;
    if (min < 60) return poi.duration_min.replace('{n}', min.toString());
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hStr = poi.duration_hr.replace('{n}', h.toString());
    if (m === 0) return hStr;
    return `${hStr} ${poi.duration_min.replace('{n}', m.toString())}`;
  }

  offset(min: number): string {
    if (min === 0) return this.t().itinerary.offset_start;
    const poi = this.t().poi;
    if (min < 60) return `+${poi.duration_min.replace('{n}', min.toString())}`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hStr = `+${poi.duration_hr.replace('{n}', h.toString())}`;
    if (m === 0) return hStr;
    return `${hStr} ${poi.duration_min.replace('{n}', m.toString())}`;
  }

  startItinerary(): void {
    const it = this.itinerary();
    if (it) void this.progress.start(it.id);
  }

  resetItinerary(): void {
    const it = this.itinerary();
    if (it) void this.progress.clear(it.id);
  }
}
