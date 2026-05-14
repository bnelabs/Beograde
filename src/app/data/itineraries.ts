import { Itinerary, Bilingual } from './types';

const bg = (en: string, sr: string = en): Bilingual => ({ en, sr_lat: sr, sr_cyr: '', tr: '' });

export const ITINERARIES: Itinerary[] = [
  {
    id: 'history-walk',
    title: bg('A Full Day in Royal Belgrade', 'Ceo dan u kraljevskom Beogradu'),
    subtitle: bg('Fortress to temple to bohemia — 9 stops, no rushing.', 'Od tvrđave do hrama do boemije — 9 stanica, bez žurbe.'),
    durationMinutes: 540,
    vibe: ['history', 'walking', 'first-time'],
    geometryUrl: 'assets/itineraries/history-walk.geojson',
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 90, notes: bg('Upper town + Military Museum + Victor at the bluff.', 'Gornji grad + Vojni muzej + Pobednik nad ušćem.') },
      { poiId: 'bajrakli-mosque', arrivalOffsetMinutes: 100, durationMinutes: 20 },
      { poiId: 'princess-ljubica', arrivalOffsetMinutes: 130, durationMinutes: 45 },
      { poiId: 'knez-mihailova', arrivalOffsetMinutes: 185, durationMinutes: 45, notes: bg('Street performers + a quick burek stop.', 'Ulični muzičari + brza pauza za burek.') },
      { poiId: 'kafana-question-mark', arrivalOffsetMinutes: 245, durationMinutes: 60, notes: bg('Long lunch. Ćevapi, sarma, half-litre of beer.', 'Dug ručak. Ćevapi, sarma, pola litra piva.') },
      { poiId: 'saint-sava', arrivalOffsetMinutes: 325, durationMinutes: 75, notes: bg('Crypt mosaics — most visitors miss them.', 'Mozaici u kripti — većina ih ne stigne videti.') },
      { poiId: 'tasmajdan-park', arrivalOffsetMinutes: 415, durationMinutes: 40, notes: bg('Sit, recharge under the plane trees.', 'Pauza pod platanima.') },
      { poiId: 'republic-square', arrivalOffsetMinutes: 460, durationMinutes: 20 },
      { poiId: 'skadarlija', arrivalOffsetMinutes: 485, durationMinutes: 55, notes: bg('Dinner with live tamburica.', 'Večera uz tamburicu uživo.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'foodie-crawl',
    title: bg('All-Day Foodie Crawl Through Dorćol', 'Celodnevna gastro tura kroz Dorćol'),
    subtitle: bg('Eight stops, ten hours, no shame.', 'Osam stanica, deset sati, nimalo srama.'),
    durationMinutes: 600,
    vibe: ['foodie', 'walking', 'evening'],
    geometryUrl: 'assets/itineraries/foodie-crawl.geojson',
    stops: [
      { poiId: 'magistrala', arrivalOffsetMinutes: 0, durationMinutes: 30, notes: bg('Flat white. Don\'t sit down yet.', 'Flat white. Nemoj još da sedaš.') },
      { poiId: 'supermarket-dorcol', arrivalOffsetMinutes: 45, durationMinutes: 90, notes: bg('Slow brunch in the courtyard. Browse the design objects.', 'Lagani brunch u dvorištu. Razgledaj dizajn predmete.') },
      { poiId: 'smokvica', arrivalOffsetMinutes: 165, durationMinutes: 45, notes: bg('Second coffee + a fig pastry, walking pace.', 'Druga kafa + kolač sa smokvom, u hodu.') },
      { poiId: 'kafana-question-mark', arrivalOffsetMinutes: 240, durationMinutes: 75, notes: bg('Late lunch the traditional way. Ćevapi five-pack.', 'Kasni ručak na tradicionalan način. Ćevapi peterac.') },
      { poiId: 'hotel-moskva', arrivalOffsetMinutes: 345, durationMinutes: 45, notes: bg('Moskva Šnit + Turkish coffee. Watch the chandelier.', 'Moskva šnit + turska kafa. Posmatraj luster.') },
      { poiId: 'beton-hala', arrivalOffsetMinutes: 420, durationMinutes: 75, notes: bg('Aperitivo facing the river. Pre-dinner snack.', 'Aperitiv okrenut ka reci. Užina pre večere.') },
      { poiId: 'skadarlija', arrivalOffsetMinutes: 525, durationMinutes: 90, notes: bg('Real dinner. Live tamburica, kafana décor.', 'Prava večera. Tamburica uživo, kafanska atmosfera.') },
      { poiId: 'cetinjska', arrivalOffsetMinutes: 540, durationMinutes: 60, notes: bg('Last drink in the brewery courtyard. Stay till midnight.', 'Poslednje piće u dvorištu pivare. Ostani do ponoći.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'riverside-splavovi',
    title: bg('Sava to Splav — Sunset to 3 AM', 'Od Save do splava — od zalaska do tri ujutru'),
    subtitle: bg('Walk the river, eat at water level, dance on it.', 'Hodaj uz reku, večeraj na vodi, igraj na njoj.'),
    durationMinutes: 540,
    vibe: ['nightlife', 'summer', 'date'],
    geometryUrl: 'assets/itineraries/riverside-splavovi.geojson',
    stops: [
      { poiId: 'belgrade-waterfront', arrivalOffsetMinutes: 0, durationMinutes: 60, notes: bg('Long walk along the new promenade. Catch boats coming in.', 'Duga šetnja novom promenadom. Posmatraj brodove.') },
      { poiId: 'brankov-most', arrivalOffsetMinutes: 70, durationMinutes: 30, notes: bg('Sunset shot from the bridge.', 'Zalazak sa mosta.') },
      { poiId: 'savamala', arrivalOffsetMinutes: 105, durationMinutes: 75, notes: bg('Pre-dinner in a gallery bar.', 'Predvečerje u galerijskom baru.') },
      { poiId: 'beton-hala', arrivalOffsetMinutes: 195, durationMinutes: 120, notes: bg('Long dinner. Watch the city light up.', 'Duga večera. Posmatraj kako se grad pali.') },
      { poiId: 'ada-bridge', arrivalOffsetMinutes: 325, durationMinutes: 30, notes: bg('Cross or photograph from below — the lit pylon at night is the shot.', 'Pređi ili fotografiši odozdo — osvetljen stub noću je kadar.') },
      { poiId: 'drugstore', arrivalOffsetMinutes: 365, durationMinutes: 75, notes: bg('Warm up the night in the ex-slaughterhouse.', 'Zagrejavanje za noć u bivšoj klanici.') },
      { poiId: 'splavovi', arrivalOffsetMinutes: 450, durationMinutes: 90, notes: bg('Pick a splav by the music spilling out. Stay till 3 AM.', 'Biraj splav po muzici. Ostani do tri.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'family-day',
    title: bg('Active Family Day — Walls, Water, Animals', 'Aktivni porodični dan — bedemi, voda, životinje'),
    subtitle: bg('Zoo, fortress, swim at Ada, science demo, ice cream stops.', 'Zoo, tvrđava, kupanje na Adi, nauka, sladoled.'),
    durationMinutes: 540,
    vibe: ['family', 'kids', 'outdoor', 'active'],
    geometryUrl: 'assets/itineraries/family-day.geojson',
    gettingThere: bg(
      'In-city the whole day, but Ada Ciganlija is 4 km from centre — take tram 7L/13/14 or bus 23/37/88 from Slavija or Trg Republike (15-20 min, 80 RSD city ticket). Cabs from city centre ~600 RSD. Back from Ada at night: bus 88 runs until ~midnight; otherwise use Pink Taxi or CarGo app.',
      'Ceo dan u gradu, ali Ada Ciganlija je 4 km od centra — tramvaj 7L/13/14 ili autobus 23/37/88 od Slavije ili Trga Republike (15-20 min, gradska karta 80 RSD). Taksi iz centra ~600 RSD. Povratak sa Ade noću: autobus 88 vozi do oko ponoći; ili Pink Taxi / CarGo aplikacija.',
    ),
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 75, notes: bg('Walls and dungeon. Bring water.', 'Bedemi i tamnica. Ponesi vodu.') },
      { poiId: 'zoo-belgrade', arrivalOffsetMinutes: 90, durationMinutes: 90, notes: bg('Time the white lion feeding if you can.', 'Tempiraj hranjenje belog lava ako možeš.') },
      { poiId: 'knez-mihailova', arrivalOffsetMinutes: 195, durationMinutes: 30, notes: bg('Ice cream + a street performer.', 'Sladoled + ulični izvođač.') },
      { poiId: 'tesla-museum', arrivalOffsetMinutes: 240, durationMinutes: 60, notes: bg('Time the coil demo at the top of the hour.', 'Tempiraj demonstraciju kalema na okrugli sat.') },
      { poiId: 'ada-ciganlija', arrivalOffsetMinutes: 320, durationMinutes: 150, notes: bg('Swim, kayak, paddleboat. Rent bikes for the lake loop.', 'Kupanje, kajak, pedaline. Iznajmi bicikle za krug oko jezera.') },
      { poiId: 'tasmajdan-park', arrivalOffsetMinutes: 490, durationMinutes: 45, notes: bg('Cool-down lap before dinner. Playground at the south end.', 'Pauza pre večere. Igralište na južnom kraju.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'rainy-day',
    title: bg('Rainy Day Museums + Cafés', 'Kišni dan — muzeji i kafići'),
    subtitle: bg('Three museums, two cafés, never get wet.', 'Tri muzeja, dva kafića, bez kiše.'),
    durationMinutes: 420,
    vibe: ['rainy', 'museums', 'indoor'],
    geometryUrl: 'assets/itineraries/rainy-day.geojson',
    stops: [
      { poiId: 'national-museum', arrivalOffsetMinutes: 0, durationMinutes: 105, notes: bg('Start with the Vinča and Lepenski Vir floors.', 'Počni od spratova Vinče i Lepenskog Vira.') },
      { poiId: 'hotel-moskva', arrivalOffsetMinutes: 115, durationMinutes: 45, notes: bg('Moskva Šnit + Turkish coffee in the wood-panelled room.', 'Moskva šnit + turska kafa u drvenom salonu.') },
      { poiId: 'tesla-museum', arrivalOffsetMinutes: 175, durationMinutes: 75, notes: bg('Two demos. Stay for both.', 'Dve demonstracije. Ostani za obe.') },
      { poiId: 'princess-ljubica', arrivalOffsetMinutes: 265, durationMinutes: 50, notes: bg('Period rooms + the divan hall.', 'Sobe iz perioda + divan.') },
      { poiId: 'manaks-house', arrivalOffsetMinutes: 330, durationMinutes: 45 },
      { poiId: 'smokvica', arrivalOffsetMinutes: 385, durationMinutes: 35, notes: bg('Hot chocolate before heading home.', 'Topla čokolada pre povratka.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'viewpoint-sunset',
    title: bg('Golden Hour to Blue Hour Photo Day', 'Foto-dan od zlatnog do plavog sata'),
    subtitle: bg('Six viewpoints chasing the light. Pack a tripod.', 'Šest vidikovaca u poteri za svetlom. Ponesi stativ.') ,
    durationMinutes: 480,
    vibe: ['viewpoint', 'sunset', 'photography'],
    geometryUrl: 'assets/itineraries/viewpoint-sunset.geojson',
    gettingThere: bg(
      'Mostly walkable, but Zemun is 5 km from Kalemegdan — bus 15/84 from Zeleni venac runs every 10 min, 20 min ride, 80 RSD ticket. Ada Bridge to Saint Sava is 4 km — tram 2 from Ada to Slavija (10 min). Carry the tripod compact; on buses, fold it.',
      'Pretežno peške, ali Zemun je 5 km od Kalemegdana — autobus 15/84 od Zelenog venca svakih 10 min, 20 min vožnje, karta 80 RSD. Od Adskog mosta do Hrama Svetog Save je 4 km — tramvaj 2 od Ade do Slavije (10 min). Stativ nosi sklopljen; u autobusu ga preklopi.',
    ),
    stops: [
      { poiId: 'kalemegdan', arrivalOffsetMinutes: 0, durationMinutes: 90, notes: bg('Upper-town walls. Find the cannon platform for the wide shot.', 'Bedemi gornjeg grada. Topovska platforma za širi kadar.') },
      { poiId: 'gardos-tower', arrivalOffsetMinutes: 105, durationMinutes: 75, notes: bg('Climb up. Best look back at Belgrade from across the Danube.', 'Popni se. Najbolji pogled na Beograd sa druge strane Dunava.') },
      { poiId: 'zemun-quay', arrivalOffsetMinutes: 195, durationMinutes: 60, notes: bg('Walk back along the water for golden hour.', 'Vrati se uz vodu u zlatnom satu.') },
      { poiId: 'brankov-most', arrivalOffsetMinutes: 280, durationMinutes: 30, notes: bg('Sunset over the Sava.', 'Zalazak nad Savom.') },
      { poiId: 'ada-bridge', arrivalOffsetMinutes: 325, durationMinutes: 45, notes: bg('Blue hour at the pylon — long exposure of cars and tram.', 'Plavi sat na stubu — duga ekspozicija auta i tramvaja.') },
      { poiId: 'saint-sava', arrivalOffsetMinutes: 395, durationMinutes: 60, notes: bg('Lit dome at night. Walk around for the symmetry shot.', 'Osvetljena kupola noću. Obiđi je za simetrični kadar.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'avala-kosmaj-twin-peaks',
    title: bg('Twin Peaks — Avala + Kosmaj in One Day', 'Dva vrha — Avala i Kosmaj u jednom danu'),
    subtitle: bg('Two summits, two tower climbs, real hiking. Bus 401 + driver helps.', 'Dva vrha, dve kule, pravo planinarenje. Autobus 401 + vozač pomažu.'),
    durationMinutes: 600,
    vibe: ['hiking', 'outdoor', 'adventure', 'viewpoint'],
    geometryUrl: 'assets/itineraries/avala-kosmaj-twin-peaks.geojson',
    gettingThere: bg(
      'Avala (15 km south of Belgrade): Bus 401 from Voždovac (Banjica II terminus) runs hourly, drops you at Avala Tower base; ride ~45 min, fare 200 RSD return. Last bus back ~9 PM. Kosmaj (45 km south) is hard without a car — take a rideshare (CarGo/Pink Taxi, ~3500 RSD one-way from Avala) or join an organised half-day tour (~€35). Return to Belgrade: organised tour drops at centre; CarGo from Sopot village; or bus 441 to Mladenovac then BG-bound regional bus. Bring water + proper shoes for Kosmaj summit (1.5–2 h round trip on marked trail).',
      'Avala (15 km južno od Beograda): Autobus 401 od Voždovca (Banjica II), polazak na sat, staje kod Avalske kule; vožnja ~45 min, povratna karta 200 RSD. Poslednji autobus nazad oko 21h. Kosmaj (45 km južno) je težak bez auta — CarGo/Pink Taxi (~3500 RSD u jednom smeru sa Avale) ili organizovana poludnevna tura (~€35). Povratak: organizovana tura vraća u centar; CarGo iz sela Sopot; ili autobus 441 do Mladenovca pa regionalni do Beograda. Ponesi vodu + dobre cipele za vrh Kosmaja (1.5–2 h u jednom smeru po označenoj stazi).',
    ),
    stops: [
      { poiId: 'avala-tomb', arrivalOffsetMinutes: 0, durationMinutes: 45, notes: bg('Meštrović\'s caryatids at sunrise. The approach is steep.', 'Meštrovićeve karijatide u zoru. Prilaz je strm.') },
      { poiId: 'avala-tower', arrivalOffsetMinutes: 60, durationMinutes: 75, notes: bg('Climb to the deck. 360° from 511 m.', 'Popni se na vidikovac. 360° sa 511 m.') },
      { poiId: 'kosmaj', arrivalOffsetMinutes: 180, durationMinutes: 180, notes: bg('Two-hour summit hike. Bring water + sturdy shoes.', 'Dvosatno penjanje do vrha. Ponesi vodu + dobre cipele.') },
      { poiId: 'topcider-park', arrivalOffsetMinutes: 405, durationMinutes: 60, notes: bg('Cool down under the giant plane tree. Konak museum on the way.', 'Pauza pod ogromnim platanom. Konak muzej usput.') },
      { poiId: 'skadarlija', arrivalOffsetMinutes: 510, durationMinutes: 90, notes: bg('Earned dinner. Sit until the candles are low.', 'Zaslužena večera. Sedi dok sveće ne dogore.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'fruska-gora-day-trip',
    title: bg('Fruška Gora + Novi Sad — Monasteries to Beach', 'Fruška gora + Novi Sad — od manastira do plaže'),
    subtitle: bg('Twelve-hour day-trip. Car or organised tour required.', 'Dvanaestočasovni izlet. Auto ili organizovana tura.'),
    durationMinutes: 720,
    vibe: ['outdoor', 'adventure', 'history', 'day-trip'],
    geometryUrl: 'assets/itineraries/fruska-gora-day-trip.geojson',
    gettingThere: bg(
      'Belgrade → Novi Sad (75 km): Soko fast train from Beograd Centar (Prokop) runs ~hourly, 35-40 min, ~600 RSD one way — easiest option. Or buses every 30 min from Beograd Glavna autobuska stanica (BAS), 1h15, 800–1000 RSD. Once in Novi Sad: city bus 7A across to Petrovaradin (15 min). To Sremski Karlovci: bus 61/62 from NS centre (20 min). For Fruška Gora monastery trail: organised half-day tour from NS (€25–35 incl. transport) — without car this is the only realistic way; otherwise CarGo (~2500 RSD from Karlovci to Krušedol). Štrand reachable on foot from NS centre. Return train Novi Sad → Beograde Centar last departure ~10 PM; bus runs later.',
      'Beograd → Novi Sad (75 km): Soko brzi voz iz Beograd Centar (Prokop) polazi otprilike na sat, 35-40 min, ~600 RSD u jednom smeru — najlakša opcija. Ili autobus svakih 30 min iz BAS-a (Glavna autobuska stanica), 1h15, 800-1000 RSD. U Novom Sadu: gradski autobus 7A do Petrovaradina (15 min). Do Sremskih Karlovaca: autobus 61/62 iz centra NS (20 min). Za stazu kroz manastire Fruške gore: organizovana poludnevna tura iz NS (€25–35 sa prevozom) — bez auta jedino realno; ili CarGo (~2500 RSD od Karlovaca do Krušedola). Štrand je peške iz centra NS. Povratak: poslednji Soko Novi Sad → Beograd Centar oko 22h; autobusi voze i kasnije.',
    ),
    stops: [
      { poiId: 'petrovaradin-fortress', arrivalOffsetMinutes: 0, durationMinutes: 120, notes: bg('Underground galleries tour first, then the clock tower.', 'Prvo obilazak podzemnih galerija, pa sat-kula.') },
      { poiId: 'sremski-karlovci-cathedral', arrivalOffsetMinutes: 150, durationMinutes: 75, notes: bg('Walk the square. Try Bermet wine.', 'Prošetaj trgom. Probaj Bermet vino.') },
      { poiId: 'fruska-gora', arrivalOffsetMinutes: 270, durationMinutes: 240, notes: bg('Hike a marked monastery trail. Krušedol to Velika Remeta is doable.', 'Planinarska staza između manastira. Krušedol do Velike Remete je realno.') },
      { poiId: 'strand-novi-sad', arrivalOffsetMinutes: 540, durationMinutes: 90, notes: bg('Cool off in the Danube. Drinks on the sand.', 'Osveži se u Dunavu. Piće na pesku.') },
      { poiId: 'kafana-question-mark', arrivalOffsetMinutes: 660, durationMinutes: 60, notes: bg('Late dinner back in Belgrade. You earned it.', 'Kasna večera u Beogradu. Zaslužio si.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
  {
    id: 'ada-watersports-day',
    title: bg('Ada Ciganlija All-Day Adventure', 'Ada Ciganlija — celodnevna avantura'),
    subtitle: bg('Bike, swim, kayak, climb, dance. Ten hours, no museums.', 'Bicikl, kupanje, kajak, penjanje, ples. Deset sati, bez muzeja.'),
    durationMinutes: 600,
    vibe: ['active', 'adventure', 'summer', 'outdoor'],
    geometryUrl: 'assets/itineraries/ada-watersports-day.geojson',
    gettingThere: bg(
      'To Ada Ciganlija: tram 7L/13/14 or bus 23/37/52/56/88 from Slavija or Trg Republike, 15 min, 80 RSD city ticket. Bike rentals + life vests at the main entrance (~500–800 RSD/h). Kayak/SUP rentals on the south shore. After dark return to centre: bus 88 + 511 run until ~midnight; afterwards CarGo or Pink Taxi (~700–900 RSD). The splavovi cluster on the Sava (last stop) is a short walk from Brankov Most — tram 2/5 returns you to Slavija until ~1 AM.',
      'Do Ade Ciganlije: tramvaj 7L/13/14 ili autobus 23/37/52/56/88 od Slavije ili Trga Republike, 15 min, gradska karta 80 RSD. Iznajmljivanje bicikala + prsluka na glavnom ulazu (~500-800 RSD/h). Kajak/SUP na južnoj obali. Povratak u centar uveče: autobusi 88 i 511 voze do oko ponoći; kasnije CarGo ili Pink Taxi (~700-900 RSD). Splavovi na Savi (poslednja stanica) su nadomak Brankovog mosta — tramvaji 2/5 voze do Slavije do oko 1h.',
    ),
    stops: [
      { poiId: 'ada-ciganlija', arrivalOffsetMinutes: 0, durationMinutes: 240, notes: bg('Rent bike + life vest at the entrance. Kayak rental on the south shore. Full lake loop is 8 km.', 'Iznajmi bicikl + prsluk na ulazu. Kajak na južnoj obali. Krug oko jezera je 8 km.') },
      { poiId: 'ada-bridge', arrivalOffsetMinutes: 255, durationMinutes: 45, notes: bg('Cycle across. Photo from the cable deck.', 'Pređi biciklom. Slika sa kablovskog dela.') },
      { poiId: 'belgrade-waterfront', arrivalOffsetMinutes: 320, durationMinutes: 75, notes: bg('Late lunch + shower at any of the riverside spots.', 'Kasni ručak + tuš na nekom mestu uz reku.') },
      { poiId: 'saint-sava', arrivalOffsetMinutes: 415, durationMinutes: 45, notes: bg('Walk through the gardens to cool down.', 'Šetnja kroz baštu radi smirivanja.') },
      { poiId: 'cetinjska', arrivalOffsetMinutes: 480, durationMinutes: 60 },
      { poiId: 'splavovi', arrivalOffsetMinutes: 555, durationMinutes: 45, notes: bg('Hour or two on the dance floor — earned it twice over.', 'Sat-dva na podijumu — dvostruko zaslužio.') },
    ],
    provenance: {
      translatedBy: { sr: 'auto-draft' as const, tr: 'auto-draft' as const },
      lastReviewedAt: '2026-05-11',
    },
  },
];

export const ITINERARY_BY_ID = new Map<string, Itinerary>(
  ITINERARIES.map((i) => [i.id, i]),
);

export function getItinerary(id: string): Itinerary | undefined {
  return ITINERARY_BY_ID.get(id);
}
