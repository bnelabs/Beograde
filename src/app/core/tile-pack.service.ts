import { Injectable, inject, signal } from '@angular/core';
import { TilePackMeta } from './idb';
import { TILE_PACK_STORE } from './tile-pack-store';

export type TilePackStatus = 'checking' | 'missing' | 'downloading' | 'ready' | 'error';

/**
 * URL the offline pack is fetched from on first run. Served from /assets/tiles/
 * by the same origin (Hetzner nginx; see deploy/nginx.conf for byte-range setup).
 */
export const TILE_PACK_URL = 'assets/tiles/belgrade.pmtiles';

// PMTiles archives start with the ASCII bytes "PMTiles" (7 bytes, version-agnostic).
const PMTILES_MAGIC = [0x50, 0x4d, 0x54, 0x69, 0x6c, 0x65, 0x73];

function bytesStartWithPMTilesMagic(bytes: Uint8Array): boolean {
  if (bytes.length < PMTILES_MAGIC.length) return false;
  return PMTILES_MAGIC.every((b, i) => bytes[i] === b);
}

async function isPMTiles(blob: Blob): Promise<boolean> {
  if (blob.size < PMTILES_MAGIC.length) return false;
  // Use FileReader for portability — Blob.arrayBuffer() is missing in some
  // test environments (jsdom) and we only need the first few bytes.
  const head = await new Promise<ArrayBuffer>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(blob.slice(0, PMTILES_MAGIC.length));
  });
  return bytesStartWithPMTilesMagic(new Uint8Array(head));
}

@Injectable({ providedIn: 'root' })
export class TilePackService {
  readonly status = signal<TilePackStatus>('checking');
  readonly progress = signal(0);
  readonly error = signal<string | null>(null);
  readonly meta = signal<TilePackMeta | null>(null);

  private blob: Blob | null = null;
  private downloading: Promise<Blob> | null = null;
  private store = inject(TILE_PACK_STORE);

  async init(): Promise<void> {
    try {
      const stored = await this.store.getBlob();
      if (stored && (await isPMTiles(stored))) {
        this.blob = stored;
        this.meta.set((await this.store.getMeta()) ?? null);
        this.status.set('ready');
      } else {
        if (stored) await this.store.clear();
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

      // Misconfigured hosts (and Angular's dev SPA fallback) hand back the
      // index.html for missing static assets. Reject before persisting.
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.startsWith('text/html')) {
        throw new Error('Tile pack URL returned HTML, not a PMTiles archive.');
      }

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

      // Validate magic bytes from the raw chunks before persisting — avoids a
      // FileReader round-trip on the assembled Blob and works everywhere.
      if (chunks.length === 0 || !bytesStartWithPMTilesMagic(chunks[0])) {
        throw new Error('Downloaded file is not a valid PMTiles archive.');
      }
      const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
      await this.store.set(blob, { bytes: blob.size, etag });
      this.blob = blob;
      this.meta.set((await this.store.getMeta()) ?? null);
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
    await this.store.clear();
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
