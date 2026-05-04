import { POI } from './types';
import poisData from '../../assets/pois.json';

export const POIS: POI[] = poisData as POI[];

export const POI_BY_ID = new Map<string, POI>(POIS.map((p) => [p.id, p]));

export function getPoi(id: string): POI | undefined {
  return POI_BY_ID.get(id);
}

export const CATEGORY_LABELS: Record<POI['category'], string> = {
  sight: 'Sights',
  cuisine: 'Cuisine',
  nightlife: 'Nightlife',
  cafe: 'Cafés',
  museum: 'Museums',
  viewpoint: 'Viewpoints',
  park: 'Parks',
};

export const CATEGORY_ICONS: Record<POI['category'], string> = {
  sight: 'account_balance',
  cuisine: 'restaurant',
  nightlife: 'nightlife',
  cafe: 'local_cafe',
  museum: 'museum',
  viewpoint: 'visibility',
  park: 'park',
};
