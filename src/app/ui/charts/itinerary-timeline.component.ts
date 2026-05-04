import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface TimelineNode {
  label: string;
  arrivalOffsetMinutes: number;
  reached: boolean;
  isNext: boolean;
}

@Component({
  selector: 'app-itinerary-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="tl" role="group" [attr.aria-label]="ariaLabel()">
      <div class="tl-track" [style.--total-mins]="totalMinutes()">
        @for (n of nodes(); track $index) {
          <div class="tl-node"
               [style.--at]="n.arrivalOffsetMinutes / totalMinutes()"
               [class.is-reached]="n.reached"
               [class.is-next]="n.isNext"
               [attr.aria-label]="n.label + ' at ' + formatOffset(n.arrivalOffsetMinutes)">
            <span class="tl-dot"></span>
            <span class="tl-label">{{ n.label }}</span>
            <span class="tl-time">{{ formatOffset(n.arrivalOffsetMinutes) }}</span>
          </div>
        }
      </div>
    </figure>
  `,
  styles: [`
    :host { display: block; }
    .tl-track {
      position: relative;
      height: 88px;
      background: linear-gradient(90deg,
        rgba(199, 168, 121, 0.20) 0%,    /* dawn — sandstone */
        rgba(255, 227, 204, 0.25) 25%,   /* day — accent-soft */
        rgba(199, 168, 121, 0.20) 75%,   /* dusk — sandstone */
        rgba(58, 64, 86, 0.20) 100%      /* night */
      );
      border-radius: 12px;
      padding: 0 12px;
    }
    .tl-track::before {
      content: ""; position: absolute; left: 12px; right: 12px; top: 14px;
      height: 2px; background: rgba(0,0,0,0.10);
    }
    .tl-node {
      position: absolute; top: 8px;
      transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      left: calc(12px + (100% - 24px) * var(--at));
    }
    .tl-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: white; border: 2px solid var(--ink-3);
    }
    .tl-node.is-reached .tl-dot { background: var(--ink-3); border-color: var(--ink-3); }
    .tl-node.is-next .tl-dot { background: var(--accent); border-color: var(--accent); transform: scale(1.2); }
    .tl-label {
      font-size: 10px; font-weight: 600; color: var(--ink-2);
      max-width: 64px; text-align: center; line-height: 1.1;
    }
    .tl-node.is-next .tl-label { color: var(--accent); }
    .tl-time { font-size: 9px; color: var(--ink-3); font-feature-settings: "tnum"; }
  `],
})
export class ItineraryTimelineComponent {
  nodes = input.required<TimelineNode[]>();

  readonly totalMinutes = computed(() => {
    const ns = this.nodes();
    if (ns.length === 0) return 1;
    return Math.max(...ns.map(n => n.arrivalOffsetMinutes), 1);
  });

  readonly ariaLabel = computed(() => `Itinerary timeline with ${this.nodes().length} stops over ${this.totalMinutes()} minutes`);

  formatOffset(mins: number): string {
    if (mins === 0) return 'Start';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `+${m}m`;
    if (m === 0) return `+${h}h`;
    return `+${h}h${m}m`;
  }
}
