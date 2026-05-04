import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { GeolocationService } from '../../core/geolocation.service';
import { ProximityService } from '../../core/proximity.service';
import { TilePackService } from '../../core/tile-pack.service';
import { POIS, CATEGORY_LABELS } from '../../data/pois';
import { ITINERARIES, getItinerary } from '../../data/itineraries';
import { formatDistance } from '../../data/distance';

const BELGRADE_CENTER: [number, number] = [20.4612, 44.8125];

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  readonly tilePack = inject(TilePackService);
  readonly geo = inject(GeolocationService);
  readonly proximity = inject(ProximityService);
  private router = inject(Router);

  readonly itineraries = ITINERARIES;
  readonly activeItineraryId = signal<string | null>(null);
  readonly mapReady = signal(false);
  readonly mapError = signal<string | null>(null);
  readonly downloadProgressPct = computed(() =>
    Math.round(this.tilePack.progress() * 100),
  );
  readonly nearestThree = computed(() => this.proximity.ranked().slice(0, 3));

  private map: import('maplibre-gl').Map | null = null;
  private userMarker: import('maplibre-gl').Marker | null = null;
  private accuracyCircleId = 'user-accuracy';

  constructor() {
    // Re-create the map any time the tile pack becomes ready.
    effect(() => {
      if (this.tilePack.status() === 'ready' && !this.map && this.mapHost) {
        void this.bootMap();
      }
    });

    // Track user position with a marker.
    effect(() => {
      const pos = this.geo.position();
      if (!this.map || !pos) return;
      void this.ensureUserMarker(pos.lng, pos.lat, pos.accuracy);
    });

    // Render the active itinerary route.
    effect(() => {
      const id = this.activeItineraryId();
      if (!this.map) return;
      void this.renderItinerary(id);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.tilePack.init();
    if (this.tilePack.status() === 'ready') {
      await this.bootMap();
    }
  }

  ngOnDestroy(): void {
    this.geo.stop();
    this.map?.remove();
    this.map = null;
  }

  async startDownload(): Promise<void> {
    try {
      await this.tilePack.download();
    } catch {
      // Surface in template via tilePack.error()
    }
  }

  toggleGps(): void {
    if (this.geo.isWatching()) {
      this.geo.stop();
      return;
    }
    this.geo.start();
  }

  async recenterOnUser(): Promise<void> {
    try {
      const pos = this.geo.position() ?? (await this.geo.requestOnce());
      this.map?.flyTo({ center: [pos.lng, pos.lat], zoom: 16, speed: 1.4 });
    } catch {
      // Permission likely denied; the UI surfaces geo.error.
    }
  }

  setActiveItinerary(id: string | null): void {
    this.activeItineraryId.set(id);
  }

  formatDistance = formatDistance;
  categoryLabel(category: keyof typeof CATEGORY_LABELS): string {
    return CATEGORY_LABELS[category];
  }

  private async bootMap(): Promise<void> {
    if (this.map) return;
    try {
      const blob = await this.tilePack.ensurePack();
      const [{ default: maplibregl }, pmtilesLib, styleResp] = await Promise.all([
        import('maplibre-gl'),
        import('pmtiles'),
        fetch('assets/styles/map-style.json'),
      ]);
      const style = await styleResp.json();

      const protocol = new pmtilesLib.Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);

      // Structural source — reads byte ranges out of the IndexedDB-cached Blob.
      const blobSource = {
        getKey: () => 'belgrade',
        getBytes: async (offset: number, length: number) => {
          const slice = blob.slice(offset, offset + length);
          return { data: await slice.arrayBuffer() };
        },
      };
      // pmtiles.PMTiles accepts any Source-shaped object; cast to keep TS happy
      // without dragging in the full type from a dynamic import.
      const pm = new pmtilesLib.PMTiles(blobSource as unknown as ConstructorParameters<typeof pmtilesLib.PMTiles>[0]);
      protocol.add(pm);

      this.map = new maplibregl.Map({
        container: this.mapHost.nativeElement,
        style,
        center: BELGRADE_CENTER,
        zoom: 13,
        attributionControl: { compact: true },
      });
      this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      this.map.on('load', () => {
        this.addPoiLayer();
        const pos = this.geo.position();
        if (pos) void this.ensureUserMarker(pos.lng, pos.lat, pos.accuracy);
        const id = this.activeItineraryId();
        if (id) void this.renderItinerary(id);
        this.mapReady.set(true);
      });

      this.map.on('error', (e) => {
        // Don't surface tile 404s as fatal; just log.
        // eslint-disable-next-line no-console
        console.warn('MapLibre error', e?.error);
      });
    } catch (e) {
      this.mapError.set(e instanceof Error ? e.message : String(e));
    }
  }

  private addPoiLayer(): void {
    if (!this.map) return;
    const features = POIS.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name, category: p.category },
    }));
    this.map.addSource('pois', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });
    this.map.addLayer({
      id: 'poi-circles',
      type: 'circle',
      source: 'pois',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 16, 9],
        'circle-color': '#FF6321',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2,
      },
    });
    this.map.addLayer({
      id: 'poi-labels',
      type: 'symbol',
      source: 'pois',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': '#1A1A1A',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.5,
      },
    });
    this.map.on('click', 'poi-circles', (e) => {
      const id = e.features?.[0]?.properties?.['id'] as string | undefined;
      if (id) this.router.navigate(['/poi', id]);
    });
    this.map.on('mouseenter', 'poi-circles', () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'poi-circles', () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  private async ensureUserMarker(lng: number, lat: number, accuracy: number): Promise<void> {
    const { Marker } = await import('maplibre-gl');
    if (!this.map) return;
    if (!this.userMarker) {
      const el = document.createElement('div');
      el.className = 'user-dot';
      this.userMarker = new Marker({ element: el }).setLngLat([lng, lat]).addTo(this.map);
    } else {
      this.userMarker.setLngLat([lng, lat]);
    }

    // Accuracy circle (rough, in degrees — fine for a halo).
    const accuracyDegrees = accuracy / 111_320;
    const data = this.makeCircle(lng, lat, accuracyDegrees);
    const src = this.map.getSource(this.accuracyCircleId) as
      | import('maplibre-gl').GeoJSONSource
      | undefined;
    if (src) {
      src.setData(data);
    } else {
      this.map.addSource(this.accuracyCircleId, { type: 'geojson', data });
      this.map.addLayer(
        {
          id: this.accuracyCircleId,
          type: 'fill',
          source: this.accuracyCircleId,
          paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.15 },
        },
        'poi-circles',
      );
    }
  }

  private makeCircle(lng: number, lat: number, radiusDegrees: number): GeoJSON.Feature {
    const points = 64;
    const coords: [number, number][] = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      coords.push([lng + radiusDegrees * Math.cos(angle), lat + radiusDegrees * Math.sin(angle)]);
    }
    coords.push(coords[0]);
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] },
      properties: {},
    };
  }

  private async renderItinerary(id: string | null): Promise<void> {
    if (!this.map) return;
    const sourceId = 'active-itinerary';
    const layerId = 'active-itinerary-line';

    if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);

    if (!id) return;
    const itinerary = getItinerary(id);
    if (!itinerary) return;
    try {
      const resp = await fetch(itinerary.geometryUrl);
      if (!resp.ok) return;
      const geojson = await resp.json();
      this.map.addSource(sourceId, { type: 'geojson', data: geojson });
      this.map.addLayer(
        {
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#FF6321',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 5],
            'line-dasharray': [0, 2, 4],
          },
        },
        'poi-circles',
      );
      // Fit bounds to the route.
      const coords = (geojson.features?.[0]?.geometry?.coordinates ?? []) as [number, number][];
      if (coords.length) {
        const { LngLatBounds } = await import('maplibre-gl');
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new LngLatBounds(coords[0], coords[0]),
        );
        this.map.fitBounds(bounds, { padding: 60, duration: 600 });
      }
    } catch {
      // Silently ignore — itinerary geometry is optional.
    }
  }
}
