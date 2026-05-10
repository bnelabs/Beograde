import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { SavedService } from './saved.service';

describe('SavedService', () => {
  let svc: SavedService;

  beforeEach(async () => {
    // Reset the fake DB between tests.
    const dbs = await indexedDB.databases();
    for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(SavedService);
    await svc.ready();
  });

  it('starts empty', () => {
    expect(svc.list()).toEqual([]);
    expect(svc.isSaved('x')).toBe(false);
  });

  it('adds, lists, and persists', async () => {
    await svc.add('kalemegdan');
    expect(svc.isSaved('kalemegdan')).toBe(true);
    expect(svc.list().map(s => s.poiId)).toEqual(['kalemegdan']);
  });

  it('removes', async () => {
    await svc.add('kalemegdan');
    await svc.remove('kalemegdan');
    expect(svc.isSaved('kalemegdan')).toBe(false);
    expect(svc.list()).toEqual([]);
  });

  it('does not duplicate when added twice', async () => {
    await svc.add('kalemegdan');
    await svc.add('kalemegdan');
    expect(svc.list()).toHaveLength(1);
  });

  it('persists across instances', async () => {
    await svc.add('kalemegdan');
    const fresh = TestBed.inject(SavedService);
    // Singleton — same instance, but verify reload from IDB.
    await fresh.reload();
    expect(fresh.isSaved('kalemegdan')).toBe(true);
  });
});
