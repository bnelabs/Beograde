import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BottomNavComponent, NavTab } from './bottom-nav.component';

@Component({
  standalone: true,
  imports: [BottomNavComponent],
  template: `<app-bottom-nav [tabs]="tabs" [activeId]="active" />`,
})
class Host {
  tabs: NavTab[] = [
    { id: 'home', label: 'Home', icon: 'home', route: '/home' },
    { id: 'map', label: 'Map', icon: 'map', route: '/map' },
  ];
  active: NavTab['id'] = 'home';
}

describe('BottomNavComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] });
  });

  it('renders one tab per input entry', () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    expect(fix.nativeElement.querySelectorAll('.nav-tab').length).toBe(2);
  });

  it('marks the active tab with aria-current=page', () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    const homeTab = fix.nativeElement.querySelector('.nav-tab[data-id="home"]');
    const mapTab = fix.nativeElement.querySelector('.nav-tab[data-id="map"]');
    expect(homeTab.getAttribute('aria-current')).toBe('page');
    expect(mapTab.getAttribute('aria-current')).toBeNull();
  });
});
