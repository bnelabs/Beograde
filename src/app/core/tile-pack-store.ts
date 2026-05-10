import { InjectionToken } from '@angular/core';
import {
  clearTilePack,
  getTilePackBlob,
  getTilePackMeta,
  setTilePack,
  TilePackMeta,
} from './idb';

export interface TilePackStore {
  getBlob(): Promise<Blob | undefined>;
  getMeta(): Promise<TilePackMeta | undefined>;
  set(blob: Blob, meta: Omit<TilePackMeta, 'storedAt'>): Promise<void>;
  clear(): Promise<void>;
}

const idbBackedStore: TilePackStore = {
  getBlob: () => getTilePackBlob(),
  getMeta: () => getTilePackMeta(),
  set: (blob, meta) => setTilePack(blob, meta),
  clear: () => clearTilePack(),
};

export const TILE_PACK_STORE = new InjectionToken<TilePackStore>('TILE_PACK_STORE', {
  providedIn: 'root',
  factory: () => idbBackedStore,
});
