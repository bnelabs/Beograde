export interface Place {
  id: string;
  name: string;
  category: 'sight' | 'cuisine' | 'nightlife';
  description: string;
  image: string;
  location: string;
}

export const BELGRADE_PLACES: Place[] = [
  {
    id: 'kalemegdan',
    name: 'Kalemegdan Fortress',
    category: 'sight',
    description: 'The historic heart of Belgrade, offering stunning views of the Danube and Sava confluence.',
    image: 'https://images.unsplash.com/photo-1599388302325-18881267605d?q=80&w=1600',
    location: 'Kalemegdan Park'
  },
  {
    id: 'skadarlija',
    name: 'Skadarlija',
    category: 'cuisine',
    description: 'The bohemian quarter of Belgrade, filled with traditional kafanas and cobblestone streets.',
    image: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?q=80&w=1600',
    location: 'Skadarska Street'
  },
  {
    id: 'sava-temple',
    name: 'Temple of Saint Sava',
    category: 'sight',
    description: 'One of the largest Orthodox churches in the world, a symbol of the city skyline.',
    image: 'https://images.unsplash.com/photo-1599388302194-e3fc14421685?q=80&w=1600',
    location: 'Vračar'
  },
  {
    id: 'beton-hala',
    name: 'Beton Hala',
    category: 'cuisine',
    description: 'Modern dining destination by the river, featuring top-tier international cuisine.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600',
    location: 'Karađorđeva'
  },
  {
    id: 'splavovi',
    name: 'The Splavovi',
    category: 'nightlife',
    description: 'Belgrade’s famous floating clubs on the Sava and Danube rivers.',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac40014582?q=80&w=1600',
    location: 'Riverside'
  },
  {
    id: 'cetinjska',
    name: 'Cetinjska Street',
    category: 'nightlife',
    description: 'The alternative nightlife hub, home to dozens of unique bars in a former brewery.',
    image: 'https://images.unsplash.com/photo-1514525253344-99a429994c6d?q=80&w=1600',
    location: 'Dorćol'
  }
];
