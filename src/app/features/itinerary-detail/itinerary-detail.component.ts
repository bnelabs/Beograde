import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getItinerary } from '../../data/itineraries';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { formatDistance } from '../../data/distance';

@Component({
  selector: 'app-itinerary-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-detail.component.html',
})
export class ItineraryDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  protected readonly geo = inject(GeolocationService);
  protected readonly icons = CATEGORY_ICONS;
  protected fmtDistance = formatDistance;

  private idSig = toSignal(this.route.paramMap, { requireSync: true });

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
      return { stop: s, poi, distance };
    });
  });

  /** Index of the next stop the user hasn't reached (within 100 m). */
  protected readonly nextStopIndex = computed(() => {
    const stops = this.enrichedStops();
    return stops.findIndex((s) => s.distance === null || s.distance > 100);
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
}
