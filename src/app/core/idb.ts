import { get, set, del } from 'idb-keyval';

const TILE_PACK_KEY = 'tile-pack:belgrade:v1';
const TILE_PACK_META_KEY = 'tile-pack:belgrade:v1:meta';

export interface TilePackMeta {
  bytes: number;
  storedAt: number;
  etag?: string;
}

export async function getTilePackBlob(): Promise<Blob | undefined> {
  return get<Blob>(TILE_PACK_KEY);
}

export async function getTilePackMeta(): Promise<TilePackMeta | undefined> {
  return get<TilePackMeta>(TILE_PACK_META_KEY);
}

export async function setTilePack(blob: Blob, meta: Omit<TilePackMeta, 'storedAt'>): Promise<void> {
  await set(TILE_PACK_KEY, blob);
  await set(TILE_PACK_META_KEY, { ...meta, storedAt: Date.now() } satisfies TilePackMeta);
}

export async function clearTilePack(): Promise<void> {
  await del(TILE_PACK_KEY);
  await del(TILE_PACK_META_KEY);
}
