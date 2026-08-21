export const initialPackages = [
  {
    id: 'PKG-SWISS-ALPS-01',
    name: 'Swiss Alps & Glacier Wonders Odyssey',
    duration: '7 Days',
    basePrice: 185000,
    costPrice: 142000,
    taxRate: 5,
    taxInclusive: true,
    region: 'Europe',
    category: 'standard',
    trend: 'Bestseller',
    ctaBadge: 'Guaranteed Departure',
    isBespoke: false,
    slots: { booked: 6, total: 20 },
    cardImage: '/assets/unsplash-swiss-alps.jpg',
    heroImage: '/assets/unsplash-swiss-alps.jpg',
    description: 'Experience the magic of the Swiss Alps with panoramic rail journeys, glacier excursions to Jungfraujoch and Mount Titlis, and picturesque lakeside stays in Lucerne and Interlaken.',
    highlights: [
      'Top of Europe — Jungfraujoch Sphinx Observatory at 3,454m',
      'Mount Titlis rotating cable car & glacier cliff walk',
      'Panoramic 1st Class GoldenPass & Glacier Express scenic rail',
      'Lake Lucerne private champagne steamship cruise'
    ],
    inclusions: [
      '6 Nights 4-Star superior hotel accommodation',
      'Daily Swiss buffet breakfast & 4 gourmet three-course dinners',
      'Swiss Travel Pass 1st Class for unlimited transit',
      'All mountain excursion tickets and guided tours'
    ],
    exclusions: [
      'International flights to/from Zurich or Geneva',
      'Schengen Visa processing fee',
      'Personal expenses & travel insurance'
    ],
    inclusionsSelection: {
      hotel: true,
      flight: false,
      sightseeing: true,
      guide: true,
      airportTransfer: true,
      cruise: true
    },
    itinerary: [
      { day: 1, title: 'Arrival in Zurich & Scenic Train to Lucerne', desc: 'Arrive at Zurich Airport and board the panoramic train to Lucerne. Enjoy an evening walk across Chapel Bridge.' },
      { day: 2, title: 'Mount Titlis & Glacier Cave Adventure', desc: 'Ascend Mount Titlis on the world first rotating cable car. Walk the Cliff Walk suspension bridge.' },
      { day: 3, title: 'GoldenPass Scenic Rail to Interlaken', desc: 'Journey through the Brunig Pass aboard the GoldenPass Panoramic train to Interlaken.' },
      { day: 4, title: 'Jungfraujoch — Top of Europe', desc: 'Board the Eiger Express tricable gondola to Jungfraujoch. Walk through the Ice Palace.' },
      { day: 5, title: 'Zermatt & The Matterhorn Views', desc: 'Transfer to car-free Zermatt. Enjoy spectacular views of the iconic Matterhorn.' },
      { day: 6, title: 'Gornergrat Cogwheel Train & Alpine Hike', desc: 'Ride Europe highest open-air cogwheel railway to Gornergrat at 3,089m.' },
      { day: 7, title: 'Zurich Old Town & Departure', desc: 'Scenic rail return to Zurich. Enjoy historic Old Town shopping before your airport transfer.' }
    ]
  },
  {
    id: 'PKG-419ca801-c01c-49e6-bd3e-e5123129fcfa',
    name: 'Explore Vietnam',
    duration: '10 Days',
    basePrice: 166000,
    costPrice: 155000,
    taxRate: 5,
    taxInclusive: true,
    region: 'Asia',
    category: 'standard',
    trend: 'Trending',
    ctaBadge: 'Filling Fast',
    isBespoke: false,
    slots: { booked: 3, total: 15 },
    cardImage: '/assets/unsplash-pkg-card.jpg',
    heroImage: '/assets/unsplash-pkg-hero.jpg',
    description: 'Vietnam is a Southeast Asian country known for its rich history, diverse culture, and stunning landscapes. Experience Hanoi, Da Nang Golden Bridge, and an overnight luxury cruise on Ha Long Bay.',
    highlights: [
      'Main and Internal Flights Included from Mumbai',
      '4-Star Accommodation on Double / Twin sharing basis',
      'Luxury Ha Long Bay overnight cruise with full board',
      'Golden Bridge at Ba Na Hills Da Nang & Hoi An Ancient Town',
      'English speaking licensed tour manager throughout'
    ],
    inclusions: [
      'Return international flights and domestic sectors',
      '9 nights in 4-star handpicked hotels and cruise',
      'Daily breakfast, 7 lunches, and 8 specialty dinners',
      'Private air-conditioned 45-seater luxury coach'
    ],
    exclusions: [
      'Personal laundry, beverages, and tips',
      'Optional watersports or spa treatments'
    ],
    inclusionsSelection: {
      hotel: true,
      flight: true,
      sightseeing: true,
      guide: true,
      airportTransfer: true,
      cruise: true
    },
    itinerary: [
      { day: 1, title: 'Arrival in Hanoi & Water Puppet Show', desc: 'Welcome to Hanoi. Check in to your central hotel and attend a traditional water puppet performance.' },
      { day: 2, title: 'Hanoi Heritage & Street Food Trail', desc: 'Visit Ho Chi Minh Mausoleum, Temple of Literature, and taste authentic Pho in the Old Quarter.' },
      { day: 3, title: 'Ha Long Bay 5-Star Cruise Check-in', desc: 'Drive to Ha Long Bay. Board your luxury wooden junk boat and kayak through limestone karsts.' },
      { day: 4, title: 'Sung Sot Cave & Flight to Da Nang', desc: 'Explore Surprise Cave before sailing back. Afternoon flight to Da Nang coastal city.' },
      { day: 5, title: 'Ba Na Hills & Iconic Golden Bridge', desc: 'Take the cable car to Ba Na Hills and walk along the world-famous giant stone hands Golden Bridge.' },
      { day: 6, title: 'Hoi An Lantern Festival & Ancient Town', desc: 'Discover lantern-lit alleyways, Japanese Covered Bridge, and custom tailoring shops.' },
      { day: 7, title: 'Flight to Ho Chi Minh City & Ben Thanh Market', desc: 'Fly to Saigon. Visit Notre-Dame Cathedral Basilica and the vibrant Ben Thanh Market.' },
      { day: 8, title: 'Cu Chi Tunnels Historical Tour', desc: 'Explore the fascinating underground network of Cu Chi tunnels used during the war.' },
      { day: 9, title: 'Mekong Delta River Safari', desc: 'Cruise along the Mekong Delta canals, sample tropical fruits, and listen to folk music.' },
      { day: 10, title: 'Saigon Leisure & Return Departure', desc: 'Enjoy last-minute souvenir shopping before your transfer to Tan Son Nhat Airport.' }
    ]
  },
  {
    id: 'PKG-KASHMIR-01',
    name: 'Kashmir Valley & Dal Lake Paradise',
    duration: '6 Days',
    basePrice: 65000,
    costPrice: 48000,
    taxRate: 5,
    taxInclusive: true,
    region: 'India',
    category: 'standard',
    trend: 'Popular',
    ctaBadge: 'Guaranteed Departure',
    isBespoke: false,
    slots: { booked: 4, total: 20 },
    cardImage: '/assets/unsplash-kashmir.png',
    heroImage: '/assets/unsplash-kashmir.png',
    description: 'Immerse yourself in Paradise on Earth. Experience luxury heritage houseboats on Dal Lake, Gulmarg Gondola snow heights, and betaab valley in Pahalgam.',
    highlights: [
      'Heritage Cedarwood Houseboat stay on Dal Lake with private Shikara rides',
      'Gulmarg Gondola Phase 1 & Phase 2 cable car up to 13,780 ft Apharwat Peak',
      'Pahalgam Betaab Valley & Aru Valley pine meadow exploration',
      'Mughal Gardens of Srinagar: Shalimar, Nishat, and Chashme Shahi'
    ],
    inclusions: [
      '5 Nights luxury accommodation (1N Houseboat + 4N 4-Star Resort)',
      'Daily Kashmiri breakfast & traditional Wazwan dinner',
      'Dedicated private heating vehicle for all transfers',
      'All permits, entry passes, and Shikara sunset cruise'
    ],
    exclusions: ['Flights to Srinagar', 'Pony riding charges', 'Personal snow apparel rental'],
    inclusionsSelection: { hotel: true, flight: false, sightseeing: true, guide: true, airportTransfer: true, cruise: true },
    itinerary: [
      { day: 1, title: 'Arrival in Srinagar & Dal Lake Shikara Sunset', desc: 'Warm Kashmiri welcome at Srinagar airport. Check-in to luxury houseboat and sunset Shikara ride.' },
      { day: 2, title: 'Srinagar Mughal Gardens & Old City Walk', desc: 'Explore Nishat Bagh and Shalimar Bagh built by Emperor Jahangir.' },
      { day: 3, title: 'Gulmarg Meadow of Flowers & Gondola Ride', desc: 'Drive through apple orchards to Gulmarg. Ride the world highest cable car to snow peaks.' },
      { day: 4, title: 'Pahalgam Valley of Shepherds & Betaab Valley', desc: 'Scenic journey along the Lidder River to Pahalgam. Visit Chandanwari and Betaab Valley.' },
      { day: 5, title: 'Aru Valley & Saffron Fields of Pampore', desc: 'Trek to peaceful Aru meadows and visit the authentic saffron fields of Pampore.' },
      { day: 6, title: 'Srinagar Departure', desc: 'Morning Kashmiri Kahwa tea before private transfer to Srinagar International Airport.' }
    ]
  },
  {
    id: 'PKG-GREECE-01',
    name: 'Greece Island Hopper & Aegean Odyssey',
    duration: '9 Days',
    basePrice: 195000,
    costPrice: 160000,
    taxRate: 5,
    taxInclusive: true,
    region: 'Europe',
    category: 'standard',
    trend: 'Bestseller',
    ctaBadge: 'Almost Full',
    isBespoke: false,
    slots: { booked: 12, total: 16 },
    cardImage: '/assets/unsplash-greece.jpg',
    heroImage: '/assets/unsplash-santorini.jpg',
    description: 'Sail the turquoise Aegean Sea from ancient Athens to the whitewashed cliffs of Santorini and the vibrant beach clubs of Mykonos.',
    highlights: [
      'Acropolis and Parthenon VIP private morning access in Athens',
      'Semi-private sunset catamaran cruise with BBQ & Greek wine in Santorini',
      'Delos sacred island mythological cruise from Mykonos',
      'High-speed business class ferry transfers between Greek islands'
    ],
    inclusions: [
      '8 Nights boutique 4-star and 5-star whitewashed cliffside hotels',
      'Daily Mediterranean breakfast and welcome sunset dinner',
      'All inter-island high-speed hydrofoil ferry tickets',
      'Acropolis, Delos, and catamaran cruise tickets'
    ],
    exclusions: ['International airfare', 'Schengen Visa', 'City stay tax'],
    inclusionsSelection: { hotel: true, flight: false, sightseeing: true, guide: true, airportTransfer: true, cruise: true },
    itinerary: [
      { day: 1, title: 'Arrival in Athens & Plaka Walk', desc: 'Check in to boutique hotel overlooking the illuminated Acropolis. Evening stroll in historic Plaka.' },
      { day: 2, title: 'Acropolis & Ancient Agora Guided Tour', desc: 'Private guided exploration of Parthenon, Erechtheion, and the Acropolis Museum.' },
      { day: 3, title: 'Hydrofoil Ferry to Mykonos', desc: 'High-speed ferry to glamorous Mykonos. Relax at Little Venice and view the iconic windmills.' },
      { day: 4, title: 'Delos Island Ancient Sanctuary', desc: 'Sail to UNESCO-listed Delos island, birthplace of Apollo and Artemis.' },
      { day: 5, title: 'Ferry to Santorini & Oia Sunset', desc: 'Arrive at the volcanic caldera of Santorini. Watch the world-famous sunset from Oia cliffside.' },
      { day: 6, title: 'Santorini Volcano & Hot Springs Catamaran', desc: 'Swim in the volcanic hot springs and enjoy fresh Greek seafood on board.' },
      { day: 7, title: 'Akrotiri Prehistoric Ruins & Red Beach', desc: 'Explore Minoan Bronze Age ruins and relax on the vibrant volcanic Red Beach.' },
      { day: 8, title: 'Return to Athens & Farewell Dinner', desc: 'Flight back to Athens. Farewell rooftop Greek dinner with live bouzouki music.' },
      { day: 9, title: 'Athens Departure', desc: 'Private luxury transfer to Athens International Airport for your return flight.' }
    ]
  },
  {
    id: 'PKG-SAFARI-01',
    name: 'Serengeti & Masai Mara Wildlife Safari',
    duration: '8 Days',
    basePrice: 245000,
    costPrice: 195000,
    taxRate: 5,
    taxInclusive: true,
    region: 'Africa',
    category: 'standard',
    trend: 'Luxury',
    ctaBadge: 'Specialist Escorted',
    isBespoke: false,
    slots: { booked: 2, total: 12 },
    cardImage: '/assets/unsplash-safari.jpg',
    heroImage: '/assets/unsplash-african-safari.jpg',
    description: 'Witness the Great Migration across the endless plains of the Serengeti and Masai Mara. Track the Big Five with expert naturalist guides and stay in luxury tented camps.',
    highlights: [
      'Unlimited 4x4 pop-up roof safari game drives across Serengeti & Mara',
      'Ngorongoro Crater volcanic caldera floor safari with high predator density',
      'Authentic Masai warrior village cultural immersion',
      'Luxury tented safari camp stays with campfire bush dinners under African stars'
    ],
    inclusions: [
      '7 Nights luxury safari lodges and tented camps',
      'All meals: full board (breakfast, picnic lunch, multi-course dinner)',
      'Custom 4x4 Land Cruiser with pop-up roof and guaranteed window seat',
      'All national park conservation fees and English naturalist guide'
    ],
    exclusions: ['International flights', 'Hot air balloon safari optional add-on', 'Yellow fever vaccination'],
    inclusionsSelection: { hotel: true, flight: false, sightseeing: true, guide: true, airportTransfer: true, cruise: false },
    itinerary: [
      { day: 1, title: 'Arrival in Nairobi & Transfer to Masai Mara', desc: 'Meet your safari director and drive across the Great Rift Valley into the legendary Masai Mara.' },
      { day: 2, title: 'Full Day Masai Mara Big Five Game Drive', desc: 'Track lions, leopards, cheetahs, and massive elephant herds across the savannah.' },
      { day: 3, title: 'Mara River Crossing & Masai Village', desc: 'Observe hippo pools and crocodile-filled Mara river, followed by cultural tribal dancing.' },
      { day: 4, title: 'Cross Border to Serengeti National Park', desc: 'Fly or drive into Tanzania Serengeti plains, home to over two million wildebeest and zebras.' },
      { day: 5, title: 'Serengeti Central Seronera Valley Safari', desc: 'Sunrise game drive searching for apex predators and endangered black rhinos.' },
      { day: 6, title: 'Ngorongoro Conservation Area & Crater Rim', desc: 'Ascend to the crater rim with sweeping views of the world largest inactive volcanic caldera.' },
      { day: 7, title: 'Ngorongoro Crater Floor Safari & Lake Manyara', desc: 'Descend 600m to the crater floor for an action-packed morning surrounded by wildlife.' },
      { day: 8, title: 'Arusha / Kilimanjaro Airport Departure', desc: 'Visit local curio markets before your transfer to Kilimanjaro International Airport.' }
    ]
  },
  {
    id: 'PKG-BALI-01',
    name: 'Bali Tropical Escape & Nusa Penida',
    duration: '7 Days',
    basePrice: 85000,
    costPrice: 68000,
    taxRate: 5,
    taxInclusive: true,
    region: 'Asia',
    category: 'standard',
    trend: 'Popular',
    ctaBadge: 'Bestseller',
    isBespoke: false,
    slots: { booked: 5, total: 20 },
    cardImage: '/assets/unsplash-bali.jpg',
    heroImage: '/assets/unsplash-bali.jpg',
    description: 'Discover tropical Bali from Ubud jungle swings and terraced rice fields to the dramatic ocean cliffs and manta ray waters of Nusa Penida.',
    highlights: [
      'Nusa Penida West Island tour: Kelingking T-Rex cliff, Angel Billabong & Broken Beach',
      'Ubud Bali Swing and Tegallalang Emerald Rice Terraces',
      'Sunset at Tanah Lot and Uluwatu Cliffside Temple with Kecak Fire Dance',
      'Private pool villa stay in Seminyak with floating breakfast'
    ],
    inclusions: [
      '6 Nights accommodation (3N Ubud Jungle Resort + 3N Seminyak Private Pool Villa)',
      'Daily breakfast, floating breakfast, and Jimbaran Bay seafood candlelight dinner',
      'Fast boat return tickets to Nusa Penida and private island coach',
      'All temple entrances, sarong rentals, and airport transfers'
    ],
    exclusions: ['International flights', 'Indonesia tourist levy', 'Personal spa expenses'],
    inclusionsSelection: { hotel: true, flight: false, sightseeing: true, guide: true, airportTransfer: true, cruise: true },
    itinerary: [
      { day: 1, title: 'Arrival in Denpasar & Ubud Jungle Resort', desc: 'Traditional flower garland welcome at Ngurah Rai Airport and check-in to Ubud forest retreat.' },
      { day: 2, title: 'Tegallalang Rice Terraces, Bali Swing & Monkey Forest', desc: 'Soar high above the palm trees on the Bali Swing and visit Sacred Monkey Forest.' },
      { day: 3, title: 'Tirta Empul Holy Water Temple & Kintamani Volcano', desc: 'Participate in holy water cleansing ritual and view active Mount Batur volcano.' },
      { day: 4, title: 'Speedboat to Nusa Penida Island', desc: 'Board the speedboat to Nusa Penida. Marvel at the sheer drop of Kelingking T-Rex cliff.' },
      { day: 5, title: 'Seminyak Private Pool Villa & Beach Club', desc: 'Check in to luxury private pool villa and relax at Finns or Potato Head beach club.' },
      { day: 6, title: 'Uluwatu Clifftop Temple & Kecak Fire Dance', desc: 'Watch the dramatic sunset over the Indian Ocean followed by the hypnotic Kecak dance.' },
      { day: 7, title: 'Spa Relaxation & Denpasar Departure', desc: 'Enjoy 2-hour Balinese massage treatment before your airport departure.' }
    ]
  }
];

export const initialGroupDepartures = [
  {
    packageId: 'PKG-SWISS-ALPS-01',
    title: 'Swiss Alps Autumn Panorama — Oct 2026 Batch',
    departureDate: '2026-10-15',
    returnDate: '2026-10-22',
    slotsTotal: 20,
    slotsBooked: 6,
    priceModifier: 5000,
    costPrice: 142000,
    ctaBadge: 'Guaranteed Departure',
    inclusions: ['4-Star Superior Hotels', 'Daily Breakfast & 4 Dinners', 'Swiss Travel Pass 1st Class', 'Jungfraujoch & Titlis Excursions', 'Dedicated Tour Manager'],
    exclusions: ['International Flights', 'Schengen Visa', 'Travel Insurance'],
    highlights: ['Jungfraujoch Top of Europe', 'Glacier Express Scenic Train', 'Mount Titlis Rotating Cable Car', 'Lake Lucerne Cruise'],
    status: 'scheduled',
    notes: 'Autumn foliage season in the Bernese Oberland. Mild temperatures, crisp alpine air.',
    termsAndConditions: '20% deposit required at booking. Non-refundable within 30 days of departure.'
  },
  {
    packageId: 'PKG-419ca801-c01c-49e6-bd3e-e5123129fcfa',
    title: 'Vietnam Heritage & Ha Long Bay Cruise — Nov 2026 Batch',
    departureDate: '2026-11-10',
    returnDate: '2026-11-20',
    slotsTotal: 15,
    slotsBooked: 3,
    priceModifier: 0,
    costPrice: 155000,
    ctaBadge: 'Filling Fast',
    inclusions: ['Return International & Domestic Flights', '4-Star Hotels & 5-Star Cruise', 'All Meals as Specified', 'Private Air-Conditioned 45-Seater Bus', 'English Guide & Tour Manager'],
    exclusions: ['Personal Shopping', 'Optional Watersports'],
    highlights: ['Ha Long Bay Overnight Cruise', 'Hanoi Old Quarter Walk', 'Golden Bridge Ba Na Hills', 'Mekong Delta Boat Safari'],
    status: 'scheduled',
    notes: 'Peak weather in Central and South Vietnam. Clear blue skies and warm breezes.',
    termsAndConditions: 'Passport must have at least 6 months validity from return date.'
  },
  {
    packageId: 'PKG-KASHMIR-01',
    title: 'Kashmir Autumn Houseboat & Snow Valley — Oct 2026',
    departureDate: '2026-10-20',
    returnDate: '2026-10-26',
    slotsTotal: 20,
    slotsBooked: 4,
    priceModifier: 2000,
    costPrice: 48000,
    ctaBadge: 'Guaranteed Departure',
    inclusions: ['Luxury Dal Lake Houseboat', '4-Star Resorts in Gulmarg & Pahalgam', 'Daily Breakfast & Wazwan Dinner', 'Shikara Sunset Rides', 'Gondola Phase 1 & 2 Passes'],
    exclusions: ['Airfare', 'Pony riding charges', 'Personal snow gear rental'],
    highlights: ['Dal Lake Houseboat Stay', 'Gulmarg Gondola to 13,780 ft', 'Betaab Valley & Aru Valley Meadows'],
    status: 'scheduled',
    notes: 'Golden chinar leaves in full bloom across Srinagar and Shalimar gardens.',
    termsAndConditions: 'Government issued photo ID required at check-in.'
  },
  {
    packageId: 'PKG-GREECE-01',
    title: 'Aegean Blue Santorini & Mykonos Cruise — Sep 2026',
    departureDate: '2026-09-18',
    returnDate: '2026-09-27',
    slotsTotal: 16,
    slotsBooked: 12,
    priceModifier: 8000,
    costPrice: 160000,
    ctaBadge: 'Almost Full',
    inclusions: ['Boutique Whitewashed 4-Star Hotels', 'High-Speed Hydrofoil Ferry Tickets', 'Acropolis VIP Morning Tour', 'Santorini Sunset Catamaran with BBQ'],
    exclusions: ['Schengen Visa', 'International Flights', 'Stay tax'],
    highlights: ['Oia Sunset Catamaran Cruise', 'Acropolis & Parthenon', 'Delos Ancient Island Sanctuary', 'Mykonos Windmills'],
    status: 'confirmed',
    notes: 'Confirmed departure with dedicated tour escort from Athens.',
    termsAndConditions: 'All passengers must possess valid Schengen visa before departure.'
  },
  {
    packageId: 'PKG-SAFARI-01',
    title: 'Great Migration Safari Expedition — Nov 2026',
    departureDate: '2026-11-05',
    returnDate: '2026-11-13',
    slotsTotal: 12,
    slotsBooked: 2,
    priceModifier: 0,
    costPrice: 195000,
    ctaBadge: 'Specialist Escorted',
    inclusions: ['Luxury Tented Safari Lodges', 'Full Board Gourmet Bush Meals', '4x4 Land Cruiser with Pop-up Roof', 'All National Park Conservation Fees', 'Expert Naturalist Guide'],
    exclusions: ['International Flights', 'Yellow Fever Vaccination', 'Personal Tips'],
    highlights: ['Serengeti Big Five Game Drives', 'Ngorongoro Crater Floor Safari', 'Masai Tribal Cultural Village'],
    status: 'scheduled',
    notes: 'Calving season begins on the southern Serengeti plains.',
    termsAndConditions: 'Minimum age 8 years for safari game drives.'
  }
];

export const initialTestimonials = [
  {
    name: 'Ananya & Vikram Sharma',
    location: 'Mumbai, India',
    avatar: '/assets/unsplash-avatar.jpg',
    rating: 5,
    text: 'Our Swiss Alps anniversary trip curated by Kraft Your Trip was nothing short of a fairytale. The 1st class rail journeys, private champagne cruise on Lake Lucerne, and hotel balcony views of the Matterhorn exceeded every expectation.',
    package: 'Swiss Alps & Glacier Wonders Odyssey',
    type: 'consumer',
    role: 'Luxury Traveler',
    company: '',
    images: ['/assets/unsplash-swiss-alps.jpg', '/assets/unsplash-paris.jpg', '/assets/unsplash-amalfi.jpg']
  },
  {
    name: 'Rohan Mehta',
    location: 'Bangalore, India',
    avatar: '/assets/default-avatar.png',
    rating: 5,
    text: 'The Vietnam Group Tour was flawlessly organized. From the moment we landed in Hanoi to our 5-star Ha Long Bay junk boat and the Golden Bridge in Da Nang, every meal and transfer was seamless.',
    package: 'Explore Vietnam',
    type: 'consumer',
    role: 'Solo Explorer',
    company: '',
    images: ['/assets/unsplash-pkg-card.jpg', '/assets/unsplash-pkg-hero.jpg', '/assets/unsplash-thailand.jpg']
  },
  {
    name: 'Dr. Meera Nambiar',
    location: 'Chennai, India',
    avatar: '/assets/unsplash-avatar.jpg',
    rating: 5,
    text: 'Kashmir in autumn took our breath away. The luxury cedarwood houseboat on Dal Lake, morning Shikara rides, and the Gondola up to Apharwat Peak were unforgettable.',
    package: 'Kashmir Valley & Dal Lake Paradise',
    type: 'consumer',
    role: 'Family Vacationer',
    company: '',
    images: ['/assets/unsplash-kashmir.png', '/assets/test-kashmir.jpg', '/assets/unsplash-himachal.jpg']
  },
  {
    name: 'Pooja & Sameer Deshmukh',
    location: 'Pune, India',
    avatar: '/assets/default-avatar.png',
    rating: 5,
    text: 'Island hopping across Greece with Kraft Your Trip was pure bliss. The sunset catamaran cruise in Santorini with fresh grilled seafood was the highlight of our honeymoon!',
    package: 'Greece Island Hopper & Aegean Odyssey',
    type: 'consumer',
    role: 'Honeymoon Couple',
    company: '',
    images: ['/assets/unsplash-santorini.jpg', '/assets/unsplash-greece.jpg', '/assets/test-greece.jpg']
  },
  {
    name: 'Arjun Singhal',
    location: 'New Delhi, India',
    avatar: '/assets/unsplash-avatar.jpg',
    rating: 5,
    text: 'The Serengeti wildlife safari was an absolute masterclass in luxury adventure. We saw the Big Five on day two, and campfire bush dinners under the Milky Way were surreal.',
    package: 'Serengeti & Masai Mara Wildlife Safari',
    type: 'consumer',
    role: 'Wildlife Photographer',
    company: '',
    images: ['/assets/unsplash-safari.jpg', '/assets/unsplash-african-safari.jpg']
  },
  {
    name: 'Siddharth Roy',
    location: 'Kolkata, India',
    avatar: '/assets/default-avatar.png',
    rating: 5,
    text: 'Our Bali trip with private pool villa in Seminyak and day tour to Nusa Penida was 10/10. The team took care of all fast boat logistics and temple passes effortlessly.',
    package: 'Bali Tropical Escape & Nusa Penida',
    type: 'consumer',
    role: 'Adventure Enthusiast',
    company: '',
    images: ['/assets/unsplash-bali.jpg', '/assets/unsplash-maldives.jpg']
  },
  {
    name: 'Rajesh Varma (VP HR, TechCorp)',
    location: 'Hyderabad, India',
    avatar: '/assets/default-avatar.png',
    rating: 5,
    text: 'Kraft Your Trip managed our 120-person annual corporate offsite in Goa. Conference setups, beach gala dinners, and team activities were executed with military precision.',
    package: 'Goa Beachfront Leadership Offsite',
    type: 'corporate',
    role: 'Corporate Lead',
    company: 'TechCorp Solutions',
    images: ['/assets/corporate-hero.jpg', '/assets/unsplash-goa.jpg']
  }
];

export const initialCorporatePackages = [
  {
    destination: 'Goa Beachfront Leadership Offsite',
    nights: '3 Nights / 4 Days',
    startingPrice: 28000,
    category: 'india',
    imageUrl: '/assets/unsplash-goa.jpg',
    description: '5-Star luxury beachfront resort with high-tech conference ballrooms, private beach lawn gala dinners, and curated team-building water sports.',
    highlights: ['5-Star Beachfront Resort', 'Conference Hall with AV Rig', 'Sunset Cocktail Gala Dinner', 'Team Regatta Watersports']
  },
  {
    destination: 'Dubai MICE & Incentive Summit',
    nights: '4 Nights / 5 Days',
    startingPrice: 55000,
    category: 'international',
    imageUrl: '/assets/unsplash-dubai.jpg',
    description: 'World-class convention access, private desert safari gala under the stars with Arabian entertainment, Burj Khalifa lounge access, and VIP transfers.',
    highlights: ['Convention Centre Access', 'Private Desert Safari Gala', 'Burj Khalifa Top Lounge', 'Luxury Coach Transfers']
  },
  {
    destination: 'Jaipur Heritage Annual Conclave',
    nights: '3 Nights / 4 Days',
    startingPrice: 32000,
    category: 'india',
    imageUrl: '/assets/unsplash-rajasthan.jpg',
    description: 'Royal palace hotel ballroom sessions, heritage courtyard banquets with traditional Rajasthani folk performances, and polo club team engagement.',
    highlights: ['Heritage Palace Hotel Stay', 'Royal Courtyard Banquet', 'Polo Match & Team Activities', 'Curated Fort Excursions']
  }
];
