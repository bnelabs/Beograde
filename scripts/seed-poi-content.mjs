#!/usr/bin/env node
/**
 * One-shot enrichment: inject highlights / whatToExpect / tips / (optional) history
 * into the marquee POIs in src/assets/pois.json.
 *
 * Idempotent — re-running on a POI that already has these fields overwrites them
 * with the bundled content, so this file IS the source of truth for the seeded set.
 * sr_cyr is intentionally left empty: build-provenance fills it via translit.
 *
 * Content is restricted to short, widely-verifiable facts. Historic claims are
 * limited to the universally-cited basics for sights with a strong wiki record.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function b(en, sr_lat) { return { en, sr_lat, sr_cyr: '' }; }
function blist(pairs) { return pairs.map(([en, sr]) => b(en, sr)); }

/** Each value: { highlights, whatToExpect, tips, history? }. */
const CONTENT = {
  'kalemegdan': {
    highlights: blist([
      ['Walk the ramparts where the Sava meets the Danube', 'Šetnja bedemima na ušću Save u Dunav'],
      ['Pobednik (Victor) statue — Belgrade\'s most-photographed monument', 'Pobednik — najfotografisaniji spomenik Beograda'],
      ['Free admission, open 24/7 — sunset on the upper terrace is the move', 'Besplatan ulaz, otvoreno 0–24 — najlepše uveče sa gornje terase'],
      ['Roman, Byzantine, Ottoman and Habsburg layers in one fortress', 'Rimski, vizantijski, osmanski i habzburški slojevi na istom mestu'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Best free viewpoint in the city', 'Najbolji besplatan vidikovac u gradu'],
        ['Vast park space with shaded paths', 'Velik park sa zasenčenim stazama'],
        ['Multiple small museums and a clock tower', 'Više malih muzeja i sahat-kula'],
      ]),
      cons: blist([
        ['Cobblestones — pack flat shoes', 'Kaldrma — obujte ravne cipele'],
        ['Crowded on summer weekends', 'Gužva leti vikendom'],
      ]),
    },
    tips: blist([
      ['Arrive 45 minutes before sunset for the best ramparts light', 'Stignite 45 min pre zalaska — najlepša svetla na bedemima'],
      ['Skip the paid tower and walk to the Pobednik for the same view', 'Preskočite naplatu kule — sa Pobednika je isti vidik besplatno'],
      ['Use the Kalemegdan park entrance from Knez Mihailova, not the river side', 'Uđite iz Knez Mihailove, ne sa rečne strane'],
    ]),
    history: b(
      'Fortified since Roman Singidunum in the 1st century, the bastions you see today are largely Habsburg works from the 18th century. The site changed hands more than 40 times before becoming a public park in 1869.',
      'Utvrđenje od rimskog Singidunuma u 1. veku; današnji bedemi su uglavnom habzburški iz 18. veka. Mesto je menjalo vladare više od 40 puta pre nego što je 1869. postalo javni park.'
    ),
  },

  'saint-sava': {
    highlights: blist([
      ['One of the largest Orthodox churches in the world', 'Jedna od najvećih pravoslavnih crkava na svetu'],
      ['Interior mosaic completed 2020 — over 15,000 m² of gold tesserae', 'Unutrašnji mozaik dovršen 2020 — preko 15.000 m² zlatne smalte'],
      ['Free entry to the church and crypt below', 'Besplatan ulaz u hram i kriptu ispod'],
      ['Visible from across Belgrade — the dome is 70 m high', 'Vidi se iz cele varoši — kupola je visoka 70 m'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Spectacular dome mosaic — look straight up', 'Veličanstvena kupolna mozaika — pogledajte pravo gore'],
        ['Cool, quiet refuge in summer heat', 'Hladovina i tišina po letnjoj žezi'],
        ['Excellent for photos in soft afternoon light', 'Sjajno za fotografije u popodnevnoj svetlosti'],
      ]),
      cons: blist([
        ['Modest dress expected — shoulders and knees covered', 'Pristojna odeća — pokrivena ramena i kolena'],
        ['Ongoing decorative works in side chapels', 'Dekorativni radovi i dalje u sporednim kapelama'],
      ]),
    },
    tips: blist([
      ['Visit the crypt — fewer tourists and gorgeous Serbian-Byzantine fresco work', 'Posetite kriptu — manje turista i prelep srpsko-vizantijski fresko-zid'],
      ['Skip Sunday liturgy if you want a quiet visit', 'Izbegavajte nedeljnu liturgiju ako želite tišinu'],
      ['Combine with the National Library next door', 'Spojite sa Narodnom bibliotekom u istom kompleksu'],
    ]),
    history: b(
      'Construction began in 1935 on the site where Ottoman vizier Sinan Pasha is said to have burned the relics of Saint Sava in 1595. Halted twice by wars, the exterior was finished in 1989; the interior mosaic was unveiled in 2020.',
      'Gradnja je počela 1935. na mestu gde je, prema predanju, vezir Sinan-paša 1595. spalio mošti Svetog Save. Dva rata su prekidala radove; spoljašnjost je dovršena 1989, a unutrašnji mozaik otkriven 2020.'
    ),
  },

  'skadarlija': {
    highlights: blist([
      ['Cobblestone bohemian quarter — Belgrade\'s "Montmartre"', 'Bohemska kaldrmana četvrt — beogradski "Monmartr"'],
      ['Live tamburaši (string-band) music most evenings', 'Tamburaši uveče, gotovo svake večeri'],
      ['Old kafanas serving traditional Serbian dishes', 'Stare kafane sa tradicionalnom srpskom kuhinjom'],
      ['Statues of Đura Jakšić, Branislav Nušić and other writers', 'Spomenici Đure Jakšića, Branislava Nušića i drugih književnika'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Atmosphere unmatched anywhere else in town', 'Atmosfera kakvu nećete naći nigde drugde u gradu'],
        ['Vegetarian options at most kafanas now', 'Vegetarijanske opcije u većini kafana'],
        ['Walking distance from Republic Square', 'Samo nekoliko minuta od Trga republike'],
      ]),
      cons: blist([
        ['Tourist-priced — mains 15–25 €', 'Cene su za turiste — glavna jela 15–25 €'],
        ['Cobblestones tough for heels and strollers', 'Kaldrma teška za štikle i kolica'],
        ['Loud after 21:00 if you want a quiet meal', 'Bučno posle 21h ako želite mir uz jelo'],
      ]),
    },
    tips: blist([
      ['Book Tri Šešira or Šešir Moj a day ahead in season', 'Rezervišite Tri Šešira ili Šešir Moj dan ranije u sezoni'],
      ['Order šljivovica before, never with, the meat course', 'Šljivovicu pijte pre — nikad uz jelo s mesom'],
      ['Sundays are quieter and 30% cheaper at most places', 'Nedeljom je tiše i 30% jeftinije u većini kafana'],
    ]),
  },

  'knez-mihailova': {
    highlights: blist([
      ['Belgrade\'s main pedestrian shopping street', 'Glavna pešačka i šoping ulica Beograda'],
      ['19th-century facades from Republic Square to Kalemegdan', 'Fasade iz 19. veka od Trga republike do Kalemegdana'],
      ['Open-air street performers and chess tables', 'Ulični muzičari i šahovski stolovi pod otvorenim nebom'],
      ['Anchors the historic core — most landmarks branch off it', 'Kičma istorijskog jezgra — sve znamenitosti se granaju odavde'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Free, lively and central — perfect for a first walk', 'Besplatno, živo i u centru — savršeno za prvu šetnju'],
        ['Cafés, bookstores and gelato every 20 metres', 'Kafići, knjižare i sladoled na svakih 20 metara'],
      ]),
      cons: blist([
        ['Chain stores dominate — local craft is in side streets', 'Lanci dominiraju — domaći zanat je u sporednim ulicama'],
        ['Pickpockets work the busy summer evenings', 'Džeparoši rade gusto leti uveče'],
      ]),
    },
    tips: blist([
      ['Detour onto Čika Ljubina for independent shops', 'Skrenite u Čika Ljubinu za nezavisne radnje'],
      ['The Albania Palace tower at the south end is a good orientation landmark', 'Palata "Albanija" na južnom kraju je dobar orijentir'],
    ]),
  },

  'republic-square': {
    highlights: blist([
      ['"At the Horse" — Belgrade\'s universal meeting point', '"Kod konja" — opšte mesto sastanka Beograđana'],
      ['Equestrian statue of Prince Mihailo (1882)', 'Konjički spomenik knezu Mihailu (1882)'],
      ['National Museum and National Theatre flank the square', 'Narodni muzej i Narodno pozorište okružuju trg'],
      ['Pedestrian since the 2019–2020 redesign', 'Pešačka zona od rekonstrukcije 2019–2020'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Central — every tram and many buses pass nearby', 'Centralno — tu prolaze tramvaji i mnoge autobuske linije'],
        ['Good people-watching with seating along the edges', 'Sjajno za posmatranje ljudi, s klupama na ivicama'],
      ]),
      cons: blist([
        ['Limited shade in summer', 'Malo hladovine leti'],
        ['Crowded during protests and demonstrations', 'Gusto tokom protesta i okupljanja'],
      ]),
    },
    tips: blist([
      ['Use it as the start/end pin for every walking tour', 'Postavite ga kao početak/kraj svake šetnje'],
      ['The "M" Komunalac branch on the square stays open late', 'Lokal "M" Komunalac na trgu radi do kasno'],
    ]),
  },

  'hotel-moskva': {
    highlights: blist([
      ['Russian Art Nouveau (Secession) facade from 1908', 'Ruska secesija — fasada iz 1908.'],
      ['Famous Moskva šnit pastry served since the 1970s', 'Čuveni "Moskva šnit" koji se služi od 1970-ih'],
      ['Albert Einstein, Indira Gandhi and Hitchcock all stayed here', 'Među gostima: Ajnštajn, Indira Gandi, Hičkok'],
      ['Belgrade\'s most photographed building on Terazije', 'Najfotografisanije zdanje na Terazijama'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Cake-and-coffee stop with no hotel-guest gatekeeping', 'Kafa i kolač bez ulaska kao gost hotela'],
        ['Period interior — marble, brass, mosaic floors', 'Autentičan enterijer — mermer, mesing, mozaik podovi'],
      ]),
      cons: blist([
        ['Premium prices on the café terrace', 'Premium cene na terasi kafića'],
        ['Service can be slow at peak hours', 'Posluga zna biti spora u špicu'],
      ]),
    },
    tips: blist([
      ['Sit inside, not on the terrace, to see the historic café', 'Sedite unutra — terasa krije pravi izgled istorijskog kafića'],
      ['Order Moskva šnit and a Turkish coffee for the full ritual', 'Naručite Moskva šnit i tursku kafu za potpuni doživljaj'],
    ]),
  },

  'beton-hala': {
    highlights: blist([
      ['Riverside row of converted concrete warehouses', 'Rečna obala preuređenih betonskih magacina'],
      ['Sava-facing terraces — sunset reflects off Branko\'s Bridge', 'Terase ka Savi — zalazak se ogleda na Brankovom mostu'],
      ['Cluster of acclaimed restaurants and lounge bars', 'Niz cenjenih restorana i lounge barova'],
      ['Walking distance from Kalemegdan and Branko\'s Bridge', 'Pešačka razdaljina od Kalemegdana i Brankovog mosta'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Best riverfront dining in central Belgrade', 'Najbolja rečna trpeza u centru'],
        ['Live electronic DJs from Thursday onward', 'Elektronski DJ-evi od četvrtka nadalje'],
      ]),
      cons: blist([
        ['Restaurant prices among the highest in the city', 'Cene među najvišim u gradu'],
        ['Wind off the river — bring a layer year-round', 'Vetar sa reke — ponesite jaknu i leti'],
      ]),
    },
    tips: blist([
      ['Reserve a terrace table for 19:00 to catch sunset over the Sava', 'Rezervišite terasu za 19h — zalazak nad Savom'],
      ['Iva New Balkan Cuisine for tasting menus; Toro for the view', 'Iva za degustacioni meni; Toro za vidik'],
    ]),
  },

  'tasmajdan-park': {
    highlights: blist([
      ['Park built over Roman quarries — "Taš" means stone in Turkish', 'Park nad rimskim kamenolomima — "taš" znači kamen na turskom'],
      ['Saint Mark\'s Church anchors the south side', 'Crkva Svetog Marka na južnoj strani'],
      ['City swimming pool open in summer months', 'Gradski bazen radi tokom letnjih meseci'],
      ['Locals jog the perimeter loop at dusk', 'Lokalci kruže obodom predveče u trci'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Mature plane trees give deep shade', 'Stari platani daju gustu hladovinu'],
        ['Playground, sport courts and chess tables', 'Igralište, sportski tereni i šahovski stolovi'],
      ]),
      cons: blist([
        ['Limited public toilets', 'Malo javnih toaleta'],
        ['Busy on weekend afternoons', 'Gužva vikendom popodne'],
      ]),
    },
    tips: blist([
      ['Combine with Saint Mark\'s Church (free entry)', 'Spojite s Crkvom Svetog Marka (besplatan ulaz)'],
      ['The Tašmajdan pool day pass is the cheapest swim in central Belgrade', 'Dnevna karta na Tašmajdanu — najjeftinije plivanje u centru'],
    ]),
  },

  'kafana-question-mark': {
    highlights: blist([
      ['Belgrade\'s oldest still-operating kafana (1823)', 'Najstarija beogradska kafana u radu (1823)'],
      ['Named "?" after a 19th-century church complaint about its sign', 'Ime "?" potiče iz crkvene tužbe na natpis u 19. veku'],
      ['Wooden interior, low tables, handwritten menu', 'Drveni enterijer, niski stolovi, ručno pisan jelovnik'],
      ['Across from the Princess Ljubica Residence — convenient pairing', 'Preko puta Konaka kneginje Ljubice — prirodno spajanje'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Authentic Serbian classics at fair prices', 'Autentična srpska klasika po poštenoj ceni'],
        ['One of the few central restaurants with true period interior', 'Jedan od retkih u centru s pravim istorijskim enterijerom'],
      ]),
      cons: blist([
        ['Tight benches — not great for groups over six', 'Skučene klupe — nezgodno za grupe veće od šest'],
        ['Cash preferred for small bills', 'Gotovina poželjna za sitne iznose'],
      ]),
    },
    tips: blist([
      ['Try ćevapi or sarma — and don\'t skip the homemade rakija flight', 'Probajte ćevape ili sarmu — i flajt domaće rakije'],
      ['Lunch is faster than dinner; service slows after 19:00', 'Ručak je brži — posle 19h posluga usporava'],
    ]),
  },

  'cetinjska': {
    highlights: blist([
      ['Former brewery yard turned creative quarter', 'Bivše dvorište pivare pretvoreno u kreativnu četvrt'],
      ['Half a dozen indie bars sharing one industrial courtyard', 'Pola tuceta indie barova u jednom industrijskom dvorištu'],
      ['Belgrade\'s nightlife heart for under-35s on weekends', 'Srce beogradskog noćnog života vikendom za mlade'],
      ['Walking distance from Skadarlija and Republic Square', 'Pešački do Skadarlije i Trga republike'],
    ]),
    whatToExpect: {
      pros: blist([
        ['No cover at any bar — café-priced drinks', 'Nema ulaznice ni u jedan bar — pića po cenama kafića'],
        ['DJ rotation and live shows most weekends', 'DJ-evi i koncerti većinu vikenda'],
      ]),
      cons: blist([
        ['Loud and dense after midnight Friday/Saturday', 'Veoma bučno i prepuno posle ponoći petkom i subotom'],
        ['Limited seating — most of it is standing crowds', 'Malo mesta za sedenje — uglavnom stojeća publika'],
      ]),
    },
    tips: blist([
      ['Start at Polet, drift to Krafter, end the night at Dim', 'Krenite od Poleta, skoknite u Krafter, završite u Dimu'],
      ['Weeknight visits get the same vibe with half the crowd', 'Radnim danom uveče — ista atmosfera, upola manja gužva'],
    ]),
  },

  'avala-tower': {
    highlights: blist([
      ['205 m TV tower — tallest structure in the Balkans', 'TV-toranj visok 205 m — najviši objekat na Balkanu'],
      ['Original 1965 tower bombed in 1999, rebuilt 2010', 'Originalni toranj iz 1965. srušen 1999, obnovljen 2010.'],
      ['Glass-floored elevator to a 360° panorama deck', 'Lift sa staklenim podom do panoramske platforme 360°'],
      ['Sits on Mount Avala — 30 minutes from central Belgrade', 'Na planini Avali — 30 minuta od centra'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Best long-distance view of Belgrade and Šumadija', 'Najdalji vidik na Beograd i Šumadiju'],
        ['Combined with the Unknown Hero Monument for a half-day trip', 'Spojiti sa Spomenikom Neznanom junaku za poludnevni izlet'],
      ]),
      cons: blist([
        ['400 RSD admission to the deck', 'Ulaz na platformu oko 400 RSD'],
        ['Closed on windy days for safety', 'Zatvoreno kad duva — bezbednost'],
      ]),
    },
    tips: blist([
      ['Check the wind forecast before driving up', 'Proverite prognozu vetra pre odlaska'],
      ['Café on the deck overprices coffee — bring water from town', 'Kafe na platformi je preskup — ponesite vodu iz grada'],
    ]),
  },

  'petrovaradin-fortress': {
    highlights: blist([
      ['"Gibraltar of the Danube" — vast 18th-century star fortress', '"Dunavski Gibraltar" — ogromna zvezdana tvrđava 18. veka'],
      ['Iconic upside-down clock — minute hand longer than the hour hand', 'Slavni "naopaki" sat — minutara duža od kazaljke sata'],
      ['16 km of underground military tunnels (guided only)', '16 km vojnih podzemnih hodnika (samo s vodičem)'],
      ['Hosts EXIT festival every July', 'Domaćin festivala EXIT svakog jula'],
    ]),
    whatToExpect: {
      pros: blist([
        ['Sweeping view of Novi Sad across the Danube', 'Veličanstven pogled na Novi Sad preko Dunava'],
        ['Free to walk the upper plateau', 'Šetnja po gornjem platou besplatna'],
      ]),
      cons: blist([
        ['Steep cobbled climb from the bridge', 'Strm uspon kaldrmom od mosta'],
        ['Tunnel tour requires booking — limited weekly slots', 'Tura kroz tunele zahteva rezervaciju — ograničeni termini'],
      ]),
    },
    tips: blist([
      ['Climb at golden hour — Novi Sad lights up below', 'Popnite se u zlatni sat — Novi Sad se pali ispod'],
      ['The artist studios on the plateau are open weekends', 'Umetnički ateljei na platou otvoreni su vikendom'],
    ]),
  },

  'ada-ciganlija': {
    highlights: blist([
      ['Artificial lake on a Sava-side peninsula — Belgrade\'s urban beach', 'Veštačko jezero na savskom poluostrvu — gradska plaža Beograda'],
      ['7 km of swimming beaches, sandy and grassy', '7 km plaža za kupanje — peščane i travnate'],
      ['Free entry; rentable kayaks, paddle boats and bikes', 'Besplatan ulaz; iznajmljivanje kajaka, pedalina i bicikla'],
      ['Forest loop trail for runners — about 8 km', 'Šumska trkačka petlja — oko 8 km'],
    ]),
    whatToExpect: {
      pros: blist([
        ['The locals\' summer cool-down — busy and lively', 'Letnja gradska oaza — živo i puno ljudi'],
        ['Cheap grilled food along the lakeshore', 'Jeftina roštilj-hrana duž obale'],
      ]),
      cons: blist([
        ['Beaches get packed Saturday afternoons', 'Plaže prepune subotom popodne'],
        ['Water quality depends on the week — check the city flag', 'Kvalitet vode varira nedeljno — proverite gradsku zastavu'],
      ]),
    },
    tips: blist([
      ['Rent a bike at the entrance — the peninsula is bigger than it looks', 'Iznajmite bicikl na ulazu — poluostrvo je veće nego što izgleda'],
      ['Beach 3 has the shallowest water for kids', 'Plaža 3 ima najplića voda za decu'],
    ]),
  },
};

const path = resolve('src/assets/pois.json');
const list = JSON.parse(readFileSync(path, 'utf8'));

let touched = 0;
for (const poi of list) {
  const c = CONTENT[poi.id];
  if (!c) continue;
  if (c.highlights) poi.highlights = c.highlights;
  if (c.whatToExpect) poi.whatToExpect = c.whatToExpect;
  if (c.tips) poi.tips = c.tips;
  if (c.history) poi.history = c.history;
  touched++;
}

writeFileSync(path, JSON.stringify(list, null, 2) + '\n');
console.log(`seeded content for ${touched} POIs`);
