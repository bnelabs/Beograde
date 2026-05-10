import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ITINERARIES, getItinerary } from '../../data/itineraries';
import { ItineraryProgressService } from '../../core/itinerary-progress/itinerary-progress.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { CardComponent } from '../../ui/card/card.component';
import { DistanceProgressComponent } from '../../ui/charts/distance-progress.component';
import { StringsService } from '../../core/i18n/strings.service';

@Component({
  selector: 'app-itinerary-list',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, CardComponent, DistanceProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-list.component.html',
  styleUrl: './itinerary-list.component.css',
})
export class ItineraryListComponent {
  protected readonly itineraries = ITINERARIES;
  protected readonly progress = inject(ItineraryProgressService);
  private readonly strings = inject(StringsService);

  protected readonly t = this.strings.t;

  protected readonly activeItinerary = computed(() => {
    const id = this.progress.activeId();
    return id ? getItinerary(id) : null;
  });

  protected readonly inactiveItineraries = computed(() => {
    const activeId = this.progress.activeId();
    return ITINERARIES.filter(i => i.id !== activeId);
  });

  hours(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  reachedRatio(itineraryId: string): { walked: number; total: number } {
    const it = getItinerary(itineraryId);
    if (!it) return { walked: 0, total: 1 };
    const reached = this.progress.progressFor(itineraryId)?.reachedStopIds.length ?? 0;
    return { walked: reached, total: Math.max(it.stops.length - 1, 1) };
  }
}
