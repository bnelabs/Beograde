import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SavedService } from '../../core/saved/saved.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { CardComponent } from '../../ui/card/card.component';
import { getPoi, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { formatDistance } from '../../data/distance';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved.component.html',
  styleUrl: './saved.component.css',
})
export class SavedComponent {
  protected readonly saved = inject(SavedService);
  private proximity = inject(ProximityService);
  private i18n = inject(I18nService);
  protected readonly icons = CATEGORY_ICONS;
  protected fmtDistance = formatDistance;

  protected readonly t = computed(() => this.i18n.locale().locale === 'sr' ? srLatStrings : enStrings);

  protected readonly enriched = computed(() => {
    return this.saved.list()
      .map(s => {
        const poi = getPoi(s.poiId);
        if (!poi) return null;
        const distance = this.proximity.distanceTo(poi);
        return { saved: s, poi, distance };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  });
}
