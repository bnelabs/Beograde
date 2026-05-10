import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: (route) => {
      const hasLng = route.queryParamMap.has('lng');
      const hasLat = route.queryParamMap.has('lat');
      return hasLng && hasLat ? '/map' : '/home';
    },
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    data: { tab: 'home' },
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/map.component').then(m => m.MapComponent),
    data: { tab: 'map' },
  },
  {
    path: 'routes',
    loadComponent: () => import('./features/itinerary-list/itinerary-list.component').then(m => m.ItineraryListComponent),
    data: { tab: 'routes' },
  },
  {
    path: 'trips',
    loadComponent: () => import('./features/trips/trips.component').then(m => m.TripsComponent),
    data: { tab: 'trips' },
  },
  {
    path: 'saved',
    loadComponent: () => import('./features/saved/saved.component').then(m => m.SavedComponent),
    data: { tab: 'saved' },
  },
  {
    path: 'poi/:id',
    loadComponent: () => import('./features/poi-detail/poi-detail.component').then(m => m.PoiDetailComponent),
    data: { tab: 'map' },
  },
  {
    path: 'itinerary/:id',
    loadComponent: () => import('./features/itinerary-detail/itinerary-detail.component').then(m => m.ItineraryDetailComponent),
    data: { tab: 'routes' },
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    data: { tab: 'home' },
  },
  { path: '**', redirectTo: 'home' },
];
