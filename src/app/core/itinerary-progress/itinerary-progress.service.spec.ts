import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ItineraryProgressService } from './itinerary-progress.service';

describe('ItineraryProgressService', () => {
  let svc: ItineraryProgressService;

  beforeEach(async () => {
    const dbs = await indexedDB.databases();
    for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ItineraryProgressService);
    await svc.ready();
  });

  it('has no progress before start', () => {
    expect(svc.activeId()).toBeNull();
    expect(svc.progressFor('history-walk')).toBeUndefined();
  });

  it('starts an itinerary', async () => {
    await svc.start('history-walk');
    expect(svc.activeId()).toBe('history-walk');
    const p = svc.progressFor('history-walk');
    expect(p).toBeDefined();
    expect(p?.reachedStopIds).toEqual([]);
  });

  it('marks a stop reached idempotently', async () => {
    await svc.start('history-walk');
    await svc.markReached('history-walk', 'kalemegdan');
    await svc.markReached('history-walk', 'kalemegdan');
    expect(svc.progressFor('history-walk')?.reachedStopIds).toEqual(['kalemegdan']);
  });

  it('clears progress', async () => {
    await svc.start('history-walk');
    await svc.markReached('history-walk', 'kalemegdan');
    await svc.clear('history-walk');
    expect(svc.activeId()).toBeNull();
    expect(svc.progressFor('history-walk')).toBeUndefined();
  });

  it('persists across reload', async () => {
    await svc.start('history-walk');
    await svc.markReached('history-walk', 'kalemegdan');
    await svc.reload();
    expect(svc.progressFor('history-walk')?.reachedStopIds).toEqual(['kalemegdan']);
    expect(svc.activeId()).toBe('history-walk');
  });
});
