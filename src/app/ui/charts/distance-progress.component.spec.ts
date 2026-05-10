import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { DistanceProgressComponent } from './distance-progress.component';

@Component({
  standalone: true,
  imports: [DistanceProgressComponent],
  template: `<app-distance-progress [walkedMeters]="walked" [totalMeters]="total" />`,
})
class Host { walked = 250; total = 1000; }

describe('DistanceProgressComponent', () => {
  it('renders the percentage label', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    expect(fix.nativeElement.textContent).toContain('25%');
    expect(fix.nativeElement.textContent).toContain('250 m');
  });

  it('caps at 100% when walked exceeds total', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fix = TestBed.createComponent(Host);
    fix.componentInstance.walked = 1500;
    fix.componentInstance.total = 1000;
    fix.detectChanges();
    expect(fix.nativeElement.textContent).toContain('100%');
  });
});
