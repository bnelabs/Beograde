import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getItinerary } from '../../data/itineraries';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { ItineraryProgressService } from '../../core/itinerary-progress/itinerary-progress.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { ItineraryTimelineComponent, TimelineNode } from '../../ui/charts/itinerary-timeline.component';
import { DistanceProgressComponent } from '../../ui/charts/distance-progress.component';
import { formatDistance, haversineMeters } from '../../data/distance';
import { StringsService } from '../../core/i18n/strings.service';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, ItineraryTimelineComponent, DistanceProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-detail.component.html',
  styleUrl: './itinerary-detail.component.css',
})
export class ItineraryDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  private i18n = inject(I18nService);
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
    return it.stops.map((s) => {
      const poi = getPoi(s.poiId);
      const distance = poi ? this.proximity.distanceTo(poi) : null;
      const reachedIds = it ? this.progress.progressFor(it.id)?.reachedStopIds ?? [] : [];
      const reached = reachedIds.includes(s.poiId) || (distance !== null && distance <= 100);
      return { stop: s, poi, distance, reached };
    });
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

  protected readonly timelineNodes = computed<TimelineNode[]>(() => {
    const stops = this.enrichedStops();
    const nextIdx = this.nextStopIndex();
    return stops.map((s, i) => ({
      label: s.poi ? this.pickName(s.poi.name) : s.stop.poiId,
      arrivalOffsetMinutes: s.stop.arrivalOffsetMinutes,
      reached: s.reached,
      isNext: i === nextIdx,
    }));
  });

  /** Total walking distance in meters between successive stops with known POIs. */
  protected readonly totalMeters = computed(() => {
    const stops = this.enrichedStops();
    let total = 0;
    for (let i = 0; i + 1 < stops.length; i++) {
      const a = stops[i].poi, b = stops[i + 1].poi;
      if (a && b) total += haversineMeters(a, b);
    }
    return Math.max(total, 1);
  });

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
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  offset(min: number): string {
    if (min === 0) return 'Start';
    if (min < 60) return `+${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `+${h} h` : `+${h} h ${m} min`;
  }

  startItinerary(): void {
    const it = this.itinerary();
    if (it) void this.progress.start(it.id);
  }

  resetItinerary(): void {
    const it = this.itinerary();
    if (it) void this.progress.clear(it.id);
  }

  private pickName(b: { en: string; sr_lat: string; sr_cyr: string }): string {
    const loc = this.i18n.locale();
    if (loc.locale === 'sr' && b.sr_lat) return b.sr_lat;
    return b.en;
  }
}
