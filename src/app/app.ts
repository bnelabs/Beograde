import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { PwaInstallService } from './core/pwa-install.service';
import { I18nService } from './core/i18n/i18n.service';
import { BottomNavComponent, NavTab } from './ui/bottom-nav/bottom-nav.component';
import enStrings from '../i18n/en.json';
import srLatStrings from '../i18n/sr-Latn.json';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private router = inject(Router);
  protected readonly pwa = inject(PwaInstallService);
  protected readonly i18n = inject(I18nService);

  protected readonly tabs = computed<NavTab[]>(() => {
    const t = this.i18n.locale().locale === 'sr' ? srLatStrings.tabs : enStrings.tabs;
    return [
      { id: 'home', label: t.home, icon: 'home', route: '/home' },
      { id: 'map', label: t.map, icon: 'map', route: '/map' },
      { id: 'routes', label: t.routes, icon: 'route', route: '/routes' },
      { id: 'trips', label: t.trips, icon: 'directions_train', route: '/trips' },
      { id: 'saved', label: t.saved, icon: 'bookmark', route: '/saved' },
    ];
  });

  protected readonly dismissedInstallTip = signal(false);

  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
  );

  protected readonly activeTab = computed<NavTab['id']>(() => {
    this.navEnd();
    const child = this.deepestChild(this.router.routerState.root.snapshot);
    return (child?.data?.['tab'] as NavTab['id']) ?? 'home';
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
