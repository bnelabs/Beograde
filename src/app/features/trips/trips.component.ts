import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { CardComponent } from '../../ui/card/card.component';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css',
})
export class TripsComponent {
  private i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);
}
