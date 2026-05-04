import { Injectable, computed, inject } from '@angular/core';
import { POIS } from '../data/pois';
import { POI } from '../data/types';
import { haversineMeters, walkingMinutes } from '../data/distance';
import { GeolocationService } from './geolocation.service';

export interface RankedPOI {
  poi: POI;
  meters: number;
  walkMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class ProximityService {
  private geo = inject(GeolocationService);

  /** POIs ranked by walking distance to current GPS fix. Empty when no fix. */
  readonly ranked = computed<RankedPOI[]>(() => {
    const pos = this.geo.position();
    if (!pos) return [];
    return POIS
      .map((poi) => {
        const meters = haversineMeters(pos, poi);
        return { poi, meters, walkMinutes: walkingMinutes(meters) };
      })
      .sort((a, b) => a.meters - b.meters);
  });

  /** Subset of ranked POIs within a radius. Useful for "near me" UI. */
  within(radiusMeters: number): RankedPOI[] {
    return this.ranked().filter((r) => r.meters <= radiusMeters);
  }

  distanceTo(poi: POI): number | null {
    const pos = this.geo.position();
    if (!pos) return null;
    return haversineMeters(pos, poi);
  }
}
