import { TestBed } from '@angular/core/testing';
import { HoursService } from './hours.service';

describe('HoursService', () => {
  let svc: HoursService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(HoursService);
  });

  it('returns open during the listed window', () => {
    // Tuesday 14:00 — should be open under "Tu-Su 10:00-18:00"
    const tueAfternoon = new Date('2026-05-05T14:00:00');
    const result = svc.isOpenAt('Tu-Su 10:00-18:00', tueAfternoon);
    expect(result.state).toBe('open');
  });

  it('returns closed outside the window', () => {
    // Tuesday 22:00 — closed
    const tueLate = new Date('2026-05-05T22:00:00');
    const result = svc.isOpenAt('Tu-Su 10:00-18:00', tueLate);
    expect(result.state).toBe('closed');
  });

  it('returns closed on a day not in the rule', () => {
    // Monday — closed under "Tu-Su"
    const mon = new Date('2026-05-04T14:00:00');
    const result = svc.isOpenAt('Tu-Su 10:00-18:00', mon);
    expect(result.state).toBe('closed');
  });

  it('handles overnight hours (open through midnight)', () => {
    // Friday 02:00 should be OPEN under "Th-Sa 23:00-05:00"
    const friEarly = new Date('2026-05-08T02:00:00');
    const result = svc.isOpenAt('Th-Sa 23:00-05:00', friEarly);
    expect(result.state).toBe('open');
  });

  it('returns unknown for unparseable grammar', () => {
    const result = svc.isOpenAt('by appointment only', new Date('2026-05-05T14:00:00'));
    expect(result.state).toBe('unknown');
  });

  it('returns unknown for empty input', () => {
    const result = svc.isOpenAt('', new Date());
    expect(result.state).toBe('unknown');
  });

  it('returns unknown for "Always open" free-text', () => {
    // Existing dataset uses this phrasing; should yield unknown, not throw.
    const result = svc.isOpenAt('Always open', new Date());
    expect(result.state).toBe('unknown');
  });

  it('exposes a 7x24 weekly grid', () => {
    const grid = svc.weeklyGrid('Tu-Su 10:00-18:00');
    expect(grid).toHaveLength(7);
    expect(grid[0]).toHaveLength(24);
    // Tuesday (index 2 with Sunday=0): hour 14 should be open
    expect(grid[2][14]).toBe(true);
    // Tuesday hour 09 should be closed
    expect(grid[2][9]).toBe(false);
    // Monday — fully closed
    expect(grid[1].every(v => v === false)).toBe(true);
  });
});
