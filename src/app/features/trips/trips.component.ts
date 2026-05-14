import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ITINERARIES } from '../../data/itineraries';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { CardComponent } from '../../ui/card/card.component';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { StringsService } from '../../core/i18n/strings.service';
import type { Itinerary } from '../../data/types';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, I18nTextPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css',
})
export class TripsComponent {
  private readonly strings = inject(StringsService);
  protected readonly t = this.strings.t;
  protected readonly icons = CATEGORY_ICONS;

  protected readonly dayTrips = ITINERARIES.filter(i => i.kind === 'day-trip');

  mosaicTiles(it: Itinerary): { src?: string; alt: string; icon: string }[] {
    const tiles: { src?: string; alt: string; icon: string }[] = [];
    for (const stop of it.stops) {
      if (tiles.length >= 3) break;
      const poi = getPoi(stop.poiId);
      if (!poi) continue;
      tiles.push({
        src: poi.images[0]?.src,
        alt: poi.name.en,
        icon: this.icons[poi.category] ?? 'place',
      });
    }
    return tiles;
  }

  hours(min: number): string {
    const poi = this.t().poi;
    if (min < 60) return poi.duration_min.replace('{n}', min.toString());
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hStr = poi.duration_hr.replace('{n}', h.toString());
    if (m === 0) return hStr;
    return `${hStr} ${poi.duration_min.replace('{n}', m.toString())}`;
  }
}
