import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ITINERARIES, getItinerary } from '../../data/itineraries';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { ItineraryProgressService } from '../../core/itinerary-progress/itinerary-progress.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { CardComponent } from '../../ui/card/card.component';
import { DistanceProgressComponent } from '../../ui/charts/distance-progress.component';
import { StringsService } from '../../core/i18n/strings.service';
import type { Itinerary } from '../../data/types';

@Component({
  selector: 'app-itinerary-list',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, CardComponent, DistanceProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-list.component.html',
  styleUrl: './itinerary-list.component.css',
})
export class ItineraryListComponent {
  /** /routes renders in-city walks. Day-trip itineraries surface on /trips instead. */
  protected readonly itineraries = ITINERARIES.filter(i => i.kind === 'city');
  protected readonly progress = inject(ItineraryProgressService);
  private readonly strings = inject(StringsService);
  protected readonly icons = CATEGORY_ICONS;

  protected readonly t = this.strings.t;

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

  protected readonly activeItinerary = computed(() => {
    const id = this.progress.activeId();
    const it = id ? getItinerary(id) : null;
    return it && it.kind === 'city' ? it : null;
  });

  protected readonly inactiveItineraries = computed(() => {
    const activeId = this.progress.activeId();
    return this.itineraries.filter(i => i.id !== activeId);
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

  reachedRatio(itineraryId: string): { walked: number; total: number } {
    const it = getItinerary(itineraryId);
    if (!it) return { walked: 0, total: 1 };
    const reached = this.progress.progressFor(itineraryId)?.reachedStopIds.length ?? 0;
    return { walked: reached, total: Math.max(it.stops.length - 1, 1) };
  }
}
