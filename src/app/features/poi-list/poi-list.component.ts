import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { POIS, CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/pois';
import { POI } from '../../data/types';
import { GeolocationService } from '../../core/geolocation.service';
import { ProximityService } from '../../core/proximity.service';
import { HoursService } from '../../core/hours/hours.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { formatDistance, walkingMinutes } from '../../data/distance';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

type Filter = POI['category'] | 'all' | 'open-now';

@Component({
  selector: 'app-poi-list',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poi-list.component.html',
  styleUrl: './poi-list.component.css',
})
export class PoiListComponent {
  protected readonly filters: Filter[] = ['all', 'open-now', 'sight', 'cuisine', 'cafe', 'museum', 'viewpoint', 'park', 'nightlife'];
  protected readonly labels = CATEGORY_LABELS;
  protected readonly icons = CATEGORY_ICONS;
  protected readonly geo = inject(GeolocationService);
  private proximity = inject(ProximityService);
  private hours = inject(HoursService);
  private i18n = inject(I18nService);
  protected readonly filter = signal<Filter>('all');

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly visible = computed(() => {
    const f = this.filter();
    const ranked = this.proximity.ranked();
    const now = new Date();

    const matchesFilter = (poi: POI) => {
      if (f === 'all') return true;
      if (f === 'open-now') {
        return poi.hours ? this.hours.isOpenAt(poi.hours.raw, now).state === 'open' : false;
      }
      return poi.category === f;
    };

    if (ranked.length) {
      return ranked
        .filter(r => matchesFilter(r.poi))
        .map(r => ({ poi: r.poi, distance: r.meters as number | null, walk: r.walkMinutes as number | null }));
    }
    return POIS
      .filter(matchesFilter)
      .map(p => ({ poi: p, distance: null as number | null, walk: null as number | null }))
      .sort((a, b) => a.poi.name.en.localeCompare(b.poi.name.en));
  });

  filterLabel(f: Filter): string {
    if (f === 'all') return 'All';
    if (f === 'open-now') return this.t().poi.open_now;
    return this.labels[f];
  }

  fmtDistance(meters: number | null): string {
    return meters === null ? '' : formatDistance(meters);
  }

  fmtWalk(meters: number | null): string {
    return meters === null ? '' : this.t().map.min_walk.replace('{n}', walkingMinutes(meters).toString());
  }

  enableGps(): void {
    this.geo.start();
  }
}
