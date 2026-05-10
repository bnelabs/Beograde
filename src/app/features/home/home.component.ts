import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroCardComponent } from '../../ui/hero-card/hero-card.component';
import { CardComponent } from '../../ui/card/card.component';
import { ChipComponent } from '../../ui/chip/chip.component';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { TwoRiversMarkComponent } from '../../ui/two-rivers-mark/two-rivers-mark.component';
import { AppImageComponent } from '../../ui/app-image/app-image.component';
import { getPoi } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { HoursService } from '../../core/hours/hours.service';
import { ITINERARIES } from '../../data/itineraries';
import { CATEGORY_ICONS } from '../../data/pois';
import { formatDistance } from '../../data/distance';
import { StringsService } from '../../core/i18n/strings.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroCardComponent, CardComponent, ChipComponent, I18nTextPipe, TwoRiversMarkComponent, AppImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected readonly geo = inject(GeolocationService);
  private proximity = inject(ProximityService);
  private hours = inject(HoursService);
  private readonly strings = inject(StringsService);

  readonly icons = CATEGORY_ICONS;
  protected fmtDistance = formatDistance;

  protected readonly t = this.strings.t;

  /** Pick today's itinerary by current hour: morning → history-walk; midday → family-day;
   *  afternoon → viewpoint-sunset; evening → foodie-crawl; rainy fallback → rainy-day. */
  protected readonly todaysPick = computed(() => {
    const hour = new Date().getHours();
    const id =
      hour < 11 ? 'history-walk' :
      hour < 14 ? 'family-day' :
      hour < 17 ? 'viewpoint-sunset' :
      'foodie-crawl';
    return ITINERARIES.find(i => i.id === id) ?? ITINERARIES[0];
  });

  protected readonly nearestOpen = computed(() => {
    const ranked = this.proximity.ranked();
    const now = new Date();
    return ranked
      .map(r => {
        const state = r.poi.hours ? this.hours.isOpenAt(r.poi.hours.raw, now).state : 'unknown';
        return { ...r, openState: state as 'open' | 'closed' | 'unknown' };
      })
      .filter(r => r.openState !== 'closed') // keep open + unknown
      .slice(0, 5);
  });

  /** Cover image for Today's pick: the lead POI of the picked itinerary. */
  protected readonly todaysPickImage = computed(() => {
    const stops = this.todaysPick().stops ?? [];
    for (const stop of stops) {
      const poi = getPoi(stop.poiId);
      const img = poi?.images?.[0];
      if (img) return img;
    }
    return undefined;
  });

  formatHourMeta(durationMinutes: number): string {
    if (durationMinutes < 60) return `${durationMinutes} min`;
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
}
