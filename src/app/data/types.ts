export type Category = 'sight' | 'cuisine' | 'nightlife' | 'cafe' | 'museum' | 'viewpoint' | 'park';

export interface POI {
  id: string;
  name: string;
  category: Category;
  description: string;
  lng: number;
  lat: number;
  address: string;
  hours?: string;
  priceRange?: '€' | '€€' | '€€€';
  tags: string[];
  images: string[];
}

export interface ItineraryStop {
  poiId: string;
  arrivalOffsetMinutes: number;
  durationMinutes: number;
  notes?: string;
}

export interface Itinerary {
  id: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  vibe: string[];
  stops: ItineraryStop[];
  /** GeoJSON FeatureCollection with one LineString feature for the walking path. */
  geometryUrl: string;
}

export interface UserPosition {
  lng: number;
  lat: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}
