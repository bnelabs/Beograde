import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ITINERARIES } from '../../data/itineraries';

@Component({
  selector: 'app-itinerary-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './itinerary-list.component.html',
})
export class ItineraryListComponent {
  protected readonly itineraries = ITINERARIES;

  hours(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
}
