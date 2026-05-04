import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { POIS, CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/pois';
import { POI } from '../../data/types';
import { GeolocationService } from '../../core/geolocation.service';
import { ProximityService } from '../../core/proximity.service';
import { formatDistance, walkingMinutes } from '../../data/distance';

type Filter = POI['category'] | 'all';

@Component({
  selector: 'app-poi-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poi-list.component.html',
})
export class PoiListComponent {
  protected readonly filters: Filter[] = ['all', 'sight', 'cuisine', 'nightlife', 'cafe', 'museum', 'viewpoint', 'park'];
  protected readonly labels = CATEGORY_LABELS;
  protected readonly icons = CATEGORY_ICONS;
  protected readonly geo = inject(GeolocationService);
  private proximity = inject(ProximityService);

  protected readonly filter = signal<Filter>('all');

  protected readonly visible = computed(() => {
    const f = this.filter();
    const ranked = this.proximity.ranked();
    if (ranked.length) {
      return ranked
        .filter((r) => f === 'all' || r.poi.category === f)
        .map((r) => ({ poi: r.poi, distance: r.meters, walk: r.walkMinutes }));
    }
    // No GPS yet — fall back to alphabetical.
    return POIS
      .filter((p) => f === 'all' || p.category === f)
      .map((p) => ({ poi: p, distance: null as number | null, walk: null as number | null }))
      .sort((a, b) => a.poi.name.localeCompare(b.poi.name));
  });

  filterLabel(f: Filter): string {
    return f === 'all' ? 'All' : this.labels[f];
  }

  fmtDistance(meters: number | null): string {
    return meters === null ? '' : formatDistance(meters);
  }

  fmtWalk(meters: number | null): string {
    return meters === null ? '' : `${walkingMinutes(meters)} min walk`;
  }

  enableGps(): void {
    this.geo.start();
  }
}
