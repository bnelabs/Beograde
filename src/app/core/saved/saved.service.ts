import { Injectable, signal } from '@angular/core';
import { get, set } from 'idb-keyval';
import type { SavedPlace } from '../../data/types';

const KEY = 'beograde:saved:v1';

@Injectable({ providedIn: 'root' })
export class SavedService {
  readonly list = signal<SavedPlace[]>([]);
  private initial: Promise<void>;

  constructor() {
    this.initial = this.reload();
  }

  ready(): Promise<void> {
    return this.initial;
  }

  async reload(): Promise<void> {
    const stored = (await get<SavedPlace[]>(KEY)) ?? [];
    this.list.set(stored);
  }

  isSaved(poiId: string): boolean {
    return this.list().some(s => s.poiId === poiId);
  }

  async add(poiId: string, note?: string): Promise<void> {
    if (this.isSaved(poiId)) return;
    const next: SavedPlace[] = [...this.list(), { poiId, savedAt: Date.now(), note }];
    this.list.set(next);
    await set(KEY, next);
  }

  async remove(poiId: string): Promise<void> {
    const next = this.list().filter(s => s.poiId !== poiId);
    this.list.set(next);
    await set(KEY, next);
  }
}
