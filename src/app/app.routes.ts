import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/map/map.component').then((m) => m.MapComponent),
    data: { tab: 'map' },
  },
  {
    path: 'pois',
    loadComponent: () =>
      import('./features/poi-list/poi-list.component').then((m) => m.PoiListComponent),
    data: { tab: 'pois' },
  },
  {
    path: 'poi/:id',
    loadComponent: () =>
      import('./features/poi-detail/poi-detail.component').then((m) => m.PoiDetailComponent),
    data: { tab: 'pois' },
  },
  {
    path: 'itineraries',
    loadComponent: () =>
      import('./features/itinerary-list/itinerary-list.component').then(
        (m) => m.ItineraryListComponent,
      ),
    data: { tab: 'itineraries' },
  },
  {
    path: 'itinerary/:id',
    loadComponent: () =>
      import('./features/itinerary-detail/itinerary-detail.component').then(
        (m) => m.ItineraryDetailComponent,
      ),
    data: { tab: 'itineraries' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
    data: { tab: 'settings' },
  },
  { path: '**', redirectTo: '' },
];
