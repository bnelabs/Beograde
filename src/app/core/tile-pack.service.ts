import { Injectable, signal } from '@angular/core';
import { clearTilePack, getTilePackBlob, getTilePackMeta, setTilePack, TilePackMeta } from './idb';

export type TilePackStatus = 'checking' | 'missing' | 'downloading' | 'ready' | 'error';

/**
 * URL the offline pack is fetched from on first run. Served from /assets/tiles/
 * by the same origin (Hetzner nginx; see deploy/nginx.conf for byte-range setup).
 */
export const TILE_PACK_URL = 'assets/tiles/belgrade.pmtiles';

@Injectable({ providedIn: 'root' })
export class TilePackService {
  readonly status = signal<TilePackStatus>('checking');
  readonly progress = signal(0);
  readonly error = signal<string | null>(null);
  readonly meta = signal<TilePackMeta | null>(null);

  private blob: Blob | null = null;
  private downloading: Promise<Blob> | null = null;

  async init(): Promise<void> {
    try {
      const stored = await getTilePackBlob();
      if (stored) {
        this.blob = stored;
        this.meta.set((await getTilePackMeta()) ?? null);
        this.status.set('ready');
      } else {
        this.status.set('missing');
      }
    } catch (e) {
      this.error.set(this.errorMessage(e));
      this.status.set('error');
    }
  }

  /** Returns the cached pack as a Blob, or starts a download if missing. */
  async ensurePack(): Promise<Blob> {
    if (this.blob) return this.blob;
    if (this.downloading) return this.downloading;
    this.downloading = this.download();
    try {
      this.blob = await this.downloading;
      return this.blob;
    } finally {
      this.downloading = null;
    }
  }

  async download(): Promise<Blob> {
    this.status.set('downloading');
    this.progress.set(0);
    this.error.set(null);
    try {
      const res = await fetch(TILE_PACK_URL, { cache: 'no-store' });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const total = Number(res.headers.get('content-length') ?? 0);
      const etag = res.headers.get('etag') ?? undefined;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) this.progress.set(received / total);
      }

      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      await setTilePack(blob, { bytes: blob.size, etag });
      this.blob = blob;
      this.meta.set((await getTilePackMeta()) ?? null);
      this.progress.set(1);
      this.status.set('ready');
      return blob;
    } catch (e) {
      this.error.set(this.errorMessage(e));
      this.status.set('error');
      throw e;
    }
  }

  async clear(): Promise<void> {
    await clearTilePack();
    this.blob = null;
    this.meta.set(null);
    this.progress.set(0);
    this.status.set('missing');
  }

  getCachedBlob(): Blob | null {
    return this.blob;
  }

  private errorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return String(e);
  }
}
