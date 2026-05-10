import { Injectable, computed, signal } from '@angular/core';
import { get, set, del } from 'idb-keyval';
import type { ItineraryProgress } from '../../data/types';

const ALL_KEY = 'beograde:itinerary:progress:all:v1';
const ACTIVE_KEY = 'beograde:itinerary:active:v1';

@Injectable({ providedIn: 'root' })
export class ItineraryProgressService {
  private readonly map = signal<Record<string, ItineraryProgress>>({});
  readonly activeId = signal<string | null>(null);
  private initial: Promise<void>;

  readonly active = computed<ItineraryProgress | null>(() => {
    const id = this.activeId();
    return id ? this.map()[id] ?? null : null;
  });

  constructor() {
    this.initial = this.reload();
  }

  ready(): Promise<void> {
    return this.initial;
  }

  async reload(): Promise<void> {
    const stored = (await get<Record<string, ItineraryProgress>>(ALL_KEY)) ?? {};
    const active = (await get<string>(ACTIVE_KEY)) ?? null;
    this.map.set(stored);
    this.activeId.set(active);
  }

  progressFor(itineraryId: string): ItineraryProgress | undefined {
    return this.map()[itineraryId];
  }

  async start(itineraryId: string): Promise<void> {
    const existing = this.map()[itineraryId];
    if (!existing) {
      const fresh: ItineraryProgress = {
        itineraryId,
        startedAt: Date.now(),
        reachedStopIds: [],
        lastUpdatedAt: Date.now(),
      };
      const next = { ...this.map(), [itineraryId]: fresh };
      this.map.set(next);
      await set(ALL_KEY, next);
    }
    this.activeId.set(itineraryId);
    await set(ACTIVE_KEY, itineraryId);
  }

  async markReached(itineraryId: string, poiId: string): Promise<void> {
    const cur = this.map()[itineraryId];
    if (!cur) return;
    if (cur.reachedStopIds.includes(poiId)) return;
    const updated: ItineraryProgress = {
      ...cur,
      reachedStopIds: [...cur.reachedStopIds, poiId],
      lastUpdatedAt: Date.now(),
    };
    const next = { ...this.map(), [itineraryId]: updated };
    this.map.set(next);
    await set(ALL_KEY, next);
  }

  async clear(itineraryId: string): Promise<void> {
    const next = { ...this.map() };
    delete next[itineraryId];
    this.map.set(next);
    await set(ALL_KEY, next);
    if (this.activeId() === itineraryId) {
      this.activeId.set(null);
      await del(ACTIVE_KEY);
    }
  }
}
