import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy,
  ViewChild, computed, effect, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GeolocationService } from '../../core/geolocation.service';
import { ProximityService } from '../../core/proximity.service';
import { TilePackService } from '../../core/tile-pack.service';
import { HoursService } from '../../core/hours/hours.service';
import { SavedService } from '../../core/saved/saved.service';
import { POIS, CATEGORY_LABELS, CATEGORY_ICONS, getPoi } from '../../data/pois';
import { ITINERARIES, getItinerary } from '../../data/itineraries';
import { formatDistance } from '../../data/distance';
import { I18nTextPipe } from '../../ui/i18n-text/i18n-text.pipe';
import { StringsService } from '../../core/i18n/strings.service';

const BELGRADE_CENTER: [number, number] = [20.4612, 44.8125];

/**
 * Per-category fill colour for POI markers — matches the Warm Belgrade palette
 * approved 2026-05-11. Anything not in this map falls back to the accent (sight) colour.
 */
const CATEGORY_COLOR: Record<string, string> = {
  sight: '#c14e6a',     // rose
  cuisine: '#d97706',   // amber
  cafe: '#92400e',      // coffee
  nightlife: '#6b21a8', // purple
  museum: '#1e3a8a',    // deep navy
  viewpoint: '#3f6212', // forest
  park: '#3f6212',      // forest
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nTextPipe],
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
  private route = inject(ActivatedRoute);
  private readonly strings = inject(StringsService);
  private readonly hours = inject(HoursService);
  private readonly saved = inject(SavedService);

  readonly itineraries = ITINERARIES;
  readonly icons = CATEGORY_ICONS;
  readonly activeItineraryId = signal<string | null>(null);
  readonly mapReady = signal(false);
  readonly mapError = signal<string | null>(null);
  readonly downloadProgressPct = computed(() =>
    Math.round(this.tilePack.progress() * 100),
  );
  readonly nearestThree = computed(() => this.proximity.ranked().slice(0, 3));

  readonly t = this.strings.t;

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });
  private readonly intendedItinerary = computed(() => this.queryParams().get('itinerary'));
  private readonly focusedPoiId = computed(() => this.queryParams().get('focus'));

  private map: import('maplibre-gl').Map | null = null;
  private userMarker: import('maplibre-gl').Marker | null = null;
  private accuracyCircleId = 'user-accuracy';
  private lastFocusedPoiId: string | null = null;

  constructor() {
    effect(() => {
      if (this.tilePack.status() === 'ready' && !this.map && this.mapHost) {
        void this.bootMap();
      }
    });
    effect(() => {
      const pos = this.geo.position();
      if (!this.map || !pos) return;
      void this.ensureUserMarker(pos.lng, pos.lat, pos.accuracy);
    });
    effect(() => {
      const id = this.activeItineraryId();
      if (!this.map) return;
      void this.renderItinerary(id);
    });
    effect(() => {
      const id = this.intendedItinerary();
      if (id && id !== this.activeItineraryId()) this.activeItineraryId.set(id);
    });
    effect(() => {
      const id = this.focusedPoiId();
      if (!id || !this.mapReady() || !this.map) return;
      if (id === this.lastFocusedPoiId) return;
      const poi = getPoi(id);
      if (!poi) return;
      this.lastFocusedPoiId = id;
      this.map.flyTo({ center: [poi.lng, poi.lat], zoom: 16, speed: 1.4 });
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
    try { await this.tilePack.download(); } catch { /* tilePack.error surfaced in template */ }
  }

  toggleGps(): void {
    if (this.geo.isWatching()) {
      this.geo.stop();
      return;
    }
    this.geo.start();
  }

  /**
   * Recenter on user. If no watch is active, start one — otherwise the marker
   * freezes after a single fix, which is what the legacy behaviour did.
   */
  async recenterOnUser(): Promise<void> {
    try {
      const pos = this.geo.position() ?? (await this.geo.requestOnce());
      if (!this.geo.isWatching()) this.geo.start();
      this.map?.flyTo({ center: [pos.lng, pos.lat], zoom: 16, speed: 1.4 });
    } catch {
      // Permission denied — geo.error surfaces in the template.
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

      const blobSource = {
        getKey: () => 'belgrade',
        getBytes: async (offset: number, length: number) => {
          const slice = blob.slice(offset, offset + length);
          return { data: await slice.arrayBuffer() };
        },
      };
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
        console.warn('MapLibre error', e?.error);
      });
    } catch (e) {
      this.mapError.set(e instanceof Error ? e.message : String(e));
    }
  }

  private addPoiLayer(): void {
    if (!this.map) return;
    const now = new Date();
    const features = POIS.map((p) => {
      const openState = p.hours ? this.hours.isOpenAt(p.hours.raw, now).state : 'unknown';
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          name: p.name.en,
          category: p.category,
          color: CATEGORY_COLOR[p.category] ?? CATEGORY_COLOR['sight'],
          isOpen: openState === 'open' ? 1 : 0,
          isClosed: openState === 'closed' ? 1 : 0,
          isSaved: this.saved.isSaved(p.id) ? 1 : 0,
        },
      };
    });
    this.map.addSource('pois', { type: 'geojson', data: { type: 'FeatureCollection', features } });

    // Outer "halo" — green for open-now, faint for closed/unknown.
    this.map.addLayer({
      id: 'poi-halo',
      type: 'circle',
      source: 'pois',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 8, 16, 16],
        'circle-color': [
          'case',
          ['==', ['get', 'isOpen'], 1], '#2ea043',
          'transparent',
        ],
        'circle-opacity': 0.32,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 0,
      },
    });

    // Filled category-coloured pin.
    this.map.addLayer({
      id: 'poi-circles',
      type: 'circle',
      source: 'pois',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 11],
        'circle-color': ['get', 'color'],
        // Saved POIs get a bolder stroke so they pop on a busy map.
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': ['case', ['==', ['get', 'isSaved'], 1], 3, 2],
        // Closed places desaturate.
        'circle-opacity': ['case', ['==', ['get', 'isClosed'], 1], 0.55, 1],
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
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': '#3b2a17',
        'text-halo-color': '#f3ead6',
        'text-halo-width': 1.6,
      },
    });
    this.map.on('click', 'poi-circles', (e) => {
      const id = e.features?.[0]?.properties?.['id'] as string | undefined;
      if (id) void this.router.navigate(['/poi', id]);
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
    const accuracyDegrees = accuracy / 111_320;
    const data = this.makeCircle(lng, lat, accuracyDegrees);
    const src = this.map.getSource(this.accuracyCircleId) as
      | import('maplibre-gl').GeoJSONSource
      | undefined;
    if (src) {
      src.setData(data);
    } else {
      this.map.addSource(this.accuracyCircleId, { type: 'geojson', data });
      this.map.addLayer({
        id: this.accuracyCircleId,
        type: 'fill',
        source: this.accuracyCircleId,
        paint: { 'fill-color': '#2b5d8a', 'fill-opacity': 0.16 },
      }, 'poi-halo');
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
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
  }

  private async renderItinerary(id: string | null): Promise<void> {
    if (!this.map) return;
    const sourceId = 'active-itinerary';
    const layerId = 'active-itinerary-line';
    if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
    if (!id) return;
    const itinerary = getItinerary(id);
    if (!itinerary?.geometryUrl) return;
    try {
      const resp = await fetch(itinerary.geometryUrl);
      if (!resp.ok) return;
      const geojson = await resp.json();
      this.map.addSource(sourceId, { type: 'geojson', data: geojson });
      this.map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#c14e6a',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 5],
          'line-dasharray': [0, 2, 4],
        },
      }, 'poi-halo');
      const coords = (geojson.features?.[0]?.geometry?.coordinates ?? []) as [number, number][];
      if (coords.length) {
        const { LngLatBounds } = await import('maplibre-gl');
        const bounds = coords.reduce((b, c) => b.extend(c), new LngLatBounds(coords[0], coords[0]));
        this.map.fitBounds(bounds, { padding: 60, duration: 600 });
      }
    } catch {
      // Silently ignore; route is optional.
    }
  }
}
