import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TilePackService, TILE_PACK_URL } from './tile-pack.service';
import { TILE_PACK_STORE, TilePackStore } from './tile-pack-store';
import type { TilePackMeta } from './idb';

const PMTILES_HEADER = new Uint8Array([0x50, 0x4d, 0x54, 0x69, 0x6c, 0x65, 0x73, 0x03]);

function pmtilesBlob(): Blob {
  const tail = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return new Blob([PMTILES_HEADER, tail], { type: 'application/octet-stream' });
}

function htmlBlob(): Blob {
  return new Blob(['<!doctype html><html></html>'], { type: 'text/html' });
}

function fetchResponseFromBytes(bytes: Uint8Array, contentType: string): Response {
  // jsdom's Response constructor stringifies a Blob body to "[object Blob]"
  // (browsers don't), so feed the bytes via a ReadableStream instead.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': contentType, 'content-length': String(bytes.length) },
  });
}

function makeStore(): TilePackStore & { _state: { blob?: Blob; meta?: TilePackMeta } } {
  const state: { blob?: Blob; meta?: TilePackMeta } = {};
  return {
    _state: state,
    getBlob: async () => state.blob,
    getMeta: async () => state.meta,
    set: async (blob, meta) => {
      state.blob = blob;
      state.meta = { ...meta, storedAt: Date.now() };
    },
    clear: async () => {
      state.blob = undefined;
      state.meta = undefined;
    },
  };
}

describe('TilePackService', () => {
  let svc: TilePackService;
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    TestBed.configureTestingModule({
      providers: [{ provide: TILE_PACK_STORE, useValue: store }],
    });
    svc = TestBed.inject(TilePackService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('init reports missing when no pack is stored', async () => {
    await svc.init();
    expect(svc.status()).toBe('missing');
  });

  it('init clears a previously persisted non-PMTiles blob and reports missing', async () => {
    store._state.blob = htmlBlob();
    store._state.meta = { bytes: 5, storedAt: Date.now() };
    await svc.init();
    expect(svc.status()).toBe('missing');
    expect(store._state.blob).toBeUndefined();
  });

  it('init keeps a valid PMTiles blob and reports ready', async () => {
    store._state.blob = pmtilesBlob();
    store._state.meta = { bytes: 16, storedAt: Date.now() };
    await svc.init();
    expect(svc.status()).toBe('ready');
    expect(store._state.blob).toBeDefined();
  });

  it('download rejects HTML responses without persisting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toBe(TILE_PACK_URL);
        return fetchResponseFromBytes(new TextEncoder().encode('<!doctype html>'), 'text/html');
      }),
    );
    await expect(svc.download()).rejects.toThrow(/HTML/i);
    expect(svc.status()).toBe('error');
    expect(store._state.blob).toBeUndefined();
  });

  it('download rejects octet-stream that lacks PMTiles magic', async () => {
    const junk = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fetchResponseFromBytes(junk, 'application/octet-stream')),
    );
    await expect(svc.download()).rejects.toThrow(/PMTiles/);
    expect(svc.status()).toBe('error');
    expect(store._state.blob).toBeUndefined();
  });

  it('download persists a real PMTiles blob and reports ready', async () => {
    const bytes = new Uint8Array([...PMTILES_HEADER, 0, 0, 0, 0, 0, 0, 0, 0]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fetchResponseFromBytes(bytes, 'application/octet-stream')),
    );
    await svc.download();
    expect(svc.status()).toBe('ready');
    expect(store._state.blob).toBeDefined();
  });
});
