import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { PwaInstallService } from './core/pwa-install.service';

interface NavTab {
  id: 'map' | 'pois' | 'itineraries' | 'settings';
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private router = inject(Router);
  protected readonly pwa = inject(PwaInstallService);

  protected readonly tabs: NavTab[] = [
    { id: 'map', label: 'Map', icon: 'map', route: '/' },
    { id: 'pois', label: 'Places', icon: 'explore', route: '/pois' },
    { id: 'itineraries', label: 'Routes', icon: 'route', route: '/itineraries' },
    { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  protected readonly dismissedInstallTip = signal(false);

  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
  );

  protected readonly activeTab = computed<NavTab['id']>(() => {
    // Recompute on every NavigationEnd.
    this.navEnd();
    const child = this.deepestChild(this.router.routerState.root.snapshot);
    return (child?.data?.['tab'] as NavTab['id']) ?? 'map';
  });

  protected readonly showIosInstallTip = computed(
    () => this.pwa.isIos() && !this.pwa.isStandalone() && !this.dismissedInstallTip(),
  );

  private deepestChild(node: import('@angular/router').ActivatedRouteSnapshot): import('@angular/router').ActivatedRouteSnapshot {
    let current = node;
    while (current.firstChild) current = current.firstChild;
    return current;
  }
}
