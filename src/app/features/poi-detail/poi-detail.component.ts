import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { getPoi, CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/pois';
import { ProximityService } from '../../core/proximity.service';
import { GeolocationService } from '../../core/geolocation.service';
import { formatDistance, walkingMinutes } from '../../data/distance';

@Component({
  selector: 'app-poi-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poi-detail.component.html',
})
export class PoiDetailComponent {
  private route = inject(ActivatedRoute);
  private proximity = inject(ProximityService);
  protected readonly geo = inject(GeolocationService);

  protected readonly labels = CATEGORY_LABELS;
  protected readonly icons = CATEGORY_ICONS;

  private readonly idSig = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly poi = computed(() => {
    const id = this.idSig().get('id');
    return id ? getPoi(id) : undefined;
  });

  protected readonly distance = computed(() => {
    const p = this.poi();
    if (!p) return null;
    return this.proximity.distanceTo(p);
  });

  protected fmtDistance = formatDistance;
  protected fmtWalk(meters: number): string {
    return `${walkingMinutes(meters)} min walk`;
  }
}
