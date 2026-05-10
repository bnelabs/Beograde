import { Injectable } from '@angular/core';
// opening_hours has no first-class TS types; the default export is a constructor.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import OpeningHoursLib from 'opening_hours';

export type IsOpenState = 'open' | 'closed' | 'unknown';

export interface IsOpenResult {
  state: IsOpenState;
  /** When the current state ends, if computable (e.g. "open until 18:00"). */
  until?: Date;
}

@Injectable({ providedIn: 'root' })
export class HoursService {
  /** Single source of truth for "is this place open at time T". */
  isOpenAt(raw: string, at: Date): IsOpenResult {
    const oh = this.parse(raw);
    if (!oh) return { state: 'unknown' };
    try {
      const isOpen = oh.getState(at);
      const next = oh.getNextChange(at);
      return { state: isOpen ? 'open' : 'closed', until: next ?? undefined };
    } catch {
      return { state: 'unknown' };
    }
  }

  /**
   * Returns a 7x24 boolean grid keyed [weekday][hour] using JS weekdays
   * (0=Sunday). Each cell is true iff the place is open at the start of that
   * hour during a typical week. Used by the hours heatmap chart.
   */
  weeklyGrid(raw: string): boolean[][] {
    const oh = this.parse(raw);
    const grid: boolean[][] = Array.from({ length: 7 }, () => new Array<boolean>(24).fill(false));
    if (!oh) return grid;

    // Anchor on the most recent Sunday at 00:00 local; iterate 7×24 hourly.
    const now = new Date();
    const sunday = new Date(now);
    sunday.setHours(0, 0, 0, 0);
    sunday.setDate(sunday.getDate() - sunday.getDay());

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const t = new Date(sunday);
        t.setDate(sunday.getDate() + d);
        t.setHours(h, 0, 0, 0);
        try {
          grid[d][h] = oh.getState(t);
        } catch {
          grid[d][h] = false;
        }
      }
    }
    return grid;
  }

  private parse(raw: string): InstanceType<typeof OpeningHoursLib> | null {
    if (!raw || raw.trim().length === 0) return null;

    // Reject known free-text patterns that aren't OSM opening_hours format
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === 'always open' || trimmed === 'by appointment only') {
      return null;
    }

    try {
      return new OpeningHoursLib(raw);
    } catch {
      return null;
    }
  }
}
