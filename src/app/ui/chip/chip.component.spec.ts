import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ChipComponent } from './chip.component';

@Component({ standalone: true, imports: [ChipComponent], template: `<app-chip variant="verified">WIKI</app-chip>` })
class Host {}

describe('ChipComponent', () => {
  it('renders with the requested variant class', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    const el = fix.nativeElement.querySelector('.chip');
    expect(el).toBeTruthy();
    expect(el.classList.contains('chip-verified')).toBe(true);
    expect(el.textContent).toContain('WIKI');
  });
});
