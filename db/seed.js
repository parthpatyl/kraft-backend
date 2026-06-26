import { query } from './index.js';
import pool from './index.js';
import bcrypt from 'bcryptjs';

const initialPackages = [
  {
    id: 'pkg-kerala-backwaters',
    name: 'Kerala Backwater Escape',
    duration: '5 Nights / 6 Days',
    basePrice: 58400,
    costPrice: 42500,
    taxRate: 5,
    taxInclusive: true,
    region: 'South India',
    slots: { booked: 3, total: 12 },
    trend: 'Trending',
    inclusionsSelection: { hotel: true, sightseeing: true, guide: true, airportTransfer: true, flight: false, meals: true },
    heroImage: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2',
    cardImage: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2',
    description: 'Immerse yourself in the **serene beauty** of God\'s Own Country. Glide through tranquil backwaters on a traditional *houseboat*, explore lush spice plantations, and witness mesmerizing Kathakali performances.\n\nThis carefully curated itinerary balances **relaxation** with **cultural discovery** — perfect for families, couples, and solo travellers alike.\n\n> *"Kerala is a tropical paradise unlike any other."* — Travel + Leisure',
    highlights: ['**Houseboat** cruise on Alleppey backwaters', 'Spice plantation tour in *Munnar*', 'Kathakali dance **performance**', 'Sunset at `Varkala` beach', 'Tea garden trek in **Munnar hills**'],
    inclusions: ['Accommodation in **4-star resorts**', 'Daily breakfast & dinner', '**Houseboat** stay with all meals', 'All land *transfers*', 'English-speaking guide', 'All **entry fees** included'],
    exclusions: ['Flight tickets', 'Camera fees at monuments', 'Personal expenses', 'Tips & gratuities', 'Travel insurance'],
    itinerary: [
      { day: 1, title: 'Arrival in Kochi', desc: 'Airport pickup, transfer to hotel. Evening **harbour cruise** and seafood dinner at Fort Kochi.' },
      { day: 2, title: 'Munnar Tea Country', desc: 'Scenic drive to Munnar. Visit **tea museum** and plantations. Overnight at *hill resort*.' },
      { day: 3, title: 'Munnar Exploration', desc: '`Eravikulam National Park`, Mattupetty Dam, and Echo Point. **Spice plantation** walk.' },
      { day: 4, title: 'Alleppey Houseboat', desc: 'Board **deluxe houseboat** for backwater cruise through palm-fringed canals. Overnight on *houseboat*.' },
      { day: 5, title: 'Kumarakom & Relaxation', desc: 'Disembark at Kumarakom. Bird sanctuary visit. **Ayurvedic massage**. Lakeside resort stay.' },
      { day: 6, title: 'Departure', desc: 'Breakfast and transfer to *Kochi airport* for departure.' }
    ],
    bestMonth: 'Nov–Feb',
    ctaBadge: 'Best Seller',
    isBespoke: false
  },
  {
    id: 'pkg-rajasthan-heritage',
    name: 'Rajasthan Royal Heritage',
    duration: '7 Nights / 8 Days',
    basePrice: 89200,
    costPrice: 64800,
    taxRate: 5,
    taxInclusive: true,
    region: 'North India',
    slots: { booked: 5, total: 16 },
    trend: 'Popular',
    inclusionsSelection: { hotel: true, sightseeing: true, guide: true, airportTransfer: true, flight: false, meals: false },
    heroImage: 'https://images.unsplash.com/photo-1548013146-72479768bada',
    cardImage: 'https://images.unsplash.com/photo-1548013146-72479768bada',
    description: 'Step into a world of **royalty** with our signature Rajasthan tour. From the *pink hues* of Jaipur to the blue lanes of Jodhpur and the **golden sands** of Jaisalmer, experience India\'s most vibrant state in regal style.\n\nHighlights include:\n- **City Palace** & Hawa Mahal in Jaipur\n- **Mehrangarh Fort** sunset in Jodhpur\n- **Camel safari** in the Thar Desert\n- **Lake cruise** in Udaipur\n\n[Learn more about Rajasthan](https://www.tourism.rajasthan.gov.in)',
    highlights: ['**Jaipur** City Palace & Hawa Mahal', 'Sunset at **Mehrangarh Fort**', 'Camel safari in *Thar Desert*', '**Udaipur** lake cruise', '*Stepwell* photography'],
    inclusions: ['**Heritage** hotel accommodation', 'Daily breakfast', 'Private `AC` vehicle', '**Professional** guide', 'Monument entry fees', '**Camel safari** experience'],
    exclusions: ['Flight / train tickets', 'Lunch & dinner', 'Elephant rides', 'Camera fees', 'Personal expenses'],
    itinerary: [
      { day: 1, title: 'Arrival in Jaipur', desc: 'Airport pickup. Visit **Hawa Mahal** and **City Palace**. Evening traditional *Rajasthani dinner*.' },
      { day: 2, title: 'Jaipur Exploration', desc: '**Amber Fort**, Jantar Mantar, and local bazaars. *Block printing* workshop.' },
      { day: 3, title: 'Drive to Jodhpur', desc: 'En route visit **Pushkar** and Brahma Temple. Arrive Jodhpur by evening.' },
      { day: 4, title: 'Jodhpur & Mehrangarh', desc: '**Mehrangarh Fort** tour, Jaswant Thada, blue city walk. Evening at *Umaid Bhawan*.' },
      { day: 5, title: 'Jaisalmer Desert', desc: 'Drive to Jaisalmer. Visit **Golden Fort**. Sunset *camel safari* and desert camp dinner.' },
      { day: 6, title: 'Jaisalmer to Udaipur', desc: 'Morning fort exploration. Afternoon drive to Udaipur via **Ranakpur Jain Temple**.' },
      { day: 7, title: 'Udaipur — City of Lakes', desc: '**City Palace**, Jag Mandir, boat cruise on Lake Pichola. **Farewell dinner**.' },
      { day: 8, title: 'Departure', desc: 'Breakfast and transfer to *Udaipur airport*.' }
    ],
    bestMonth: 'Oct–Mar',
    ctaBadge: null,
    isBespoke: false
  },
  {
    id: 'pkg-himachal-adventure',
    name: 'Himachal Adventure Trail',
    duration: '6 Nights / 7 Days',
    basePrice: 67800,
    costPrice: 49200,
    taxRate: 5,
    taxInclusive: true,
    region: 'North India',
    slots: { booked: 2, total: 10 },
    trend: 'New',
    inclusionsSelection: { hotel: true, sightseeing: true, guide: true, airportTransfer: false, flight: false, meals: true },
    heroImage: 'https://images.unsplash.com/photo-1580121441575-41e4c9e2c53f',
    cardImage: 'https://images.unsplash.com/photo-1580121441575-41e4c9e2c53f',
    description: 'For the **adventure seeker** and mountain lover. Trek through *pine forests*, raft in the **Beas**, and camp under starry skies in the **Parvati Valley**.\n\nThis trip balances adrenaline with serene mountain moments:\n\n- **River rafting** in Kullu-Manali\n- **Trek** to Kheerganga hot springs\n- **Paragliding** in Bir Billing (`World\'s 2nd best paragliding site`)\n- **Camping** in Tirthan Valley\n\n> *"Adventure is worthwhile in itself."* — Amelia Earhart',
    highlights: ['**River rafting** in Kullu-Manali', 'Trek to *Kheerganga* hot springs', '**Paragliding** in Bir Billing', 'Camping in `Tirthan Valley`', '**Local** Himalayan cuisine'],
    inclusions: ['**Eco-camp** & homestay accommodation', 'All meals on trek days', '**Camping** equipment', 'Certified *trek leader*', 'First-aid & safety kit', 'Manali local sightseeing'],
    exclusions: ['Personal **trekking** gear', 'Insurance', 'Tips', 'Any adventure activities marked *optional*'],
    itinerary: [
      { day: 1, title: 'Arrival in Chandigarh', desc: 'Meet at Chandigarh airport. Drive to **Tirthan Valley**. Evening riverside camp setup.' },
      { day: 2, title: 'Tirthan Valley Trek', desc: 'Guided trek along **Tirthan river**. Great Himalayan National Park entry. *Campfire night*.' },
      { day: 3, title: 'Jibhi & Waterfall Trail', desc: 'Transfer to **Jibhi**. Waterfall trek and village walk. Overnight at *wooden cottage*.' },
      { day: 4, title: 'Manali Arrival', desc: 'Scenic drive to Manali. Visit **Hadimba Temple** and *Old Manali*. Café hopping.' },
      { day: 5, title: 'Solang Valley & Rafting', desc: 'Morning at **Solang Valley**. Afternoon river rafting on **Beas**. Evening bonfire.' },
      { day: 6, title: 'Bir Billing Paragliding', desc: 'Drive to **Bir**. Paragliding with Himalayan views. Monastery visit. Overnight.' },
      { day: 7, title: 'Departure', desc: 'Breakfast and transfer to *Chandigarh airport*.' }
    ],
    bestMonth: 'Mar–Jun, Sep–Oct',
    ctaBadge: 'Adventure',
    isBespoke: false
  },
  {
    id: 'pkg-goa-beach',
    name: 'Goa Beachside Bliss',
    duration: '3 Nights / 4 Days',
    basePrice: 32600,
    costPrice: 23800,
    taxRate: 5,
    taxInclusive: true,
    region: 'West India',
    slots: { booked: 7, total: 20 },
    trend: 'Trending',
    inclusionsSelection: { hotel: true, sightseeing: true, guide: false, airportTransfer: true, flight: false, meals: false },
    heroImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2',
    cardImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2',
    description: 'Sun, sand, and seafood — the **perfect short getaway**. Stay at a *beachfront resort*, explore Portuguese heritage, and enjoy Goa\'s legendary nightlife.\n\n**Ideal for a quick recharge:**\n- Beachfront **resort** stay\n- **North** & **South** Goa beach tour\n- Sunset cruise on *Mandovi River*\n- Portuguese **heritage** walk\n\nPack your bags and head to the **Goa** coast! 🏖️',
    highlights: ['**Beachfront** resort stay', '**North** & **South** Goa beach tour', 'Sunset cruise on *Mandovi River*', 'Portuguese **heritage** walk', 'Seafood beach shack dinner'],
    inclusions: ['**Beach** resort accommodation', 'Daily breakfast', 'Private airport *transfers*', '**Sunset cruise** tickets', 'Scooter rental for **1 day**'],
    exclusions: ['Lunch & dinner', 'Water sports activities', 'Entry to clubs/bars', 'Personal expenses'],
    itinerary: [
      { day: 1, title: 'Arrival in Goa', desc: 'Airport pickup. Check into **beach resort**. Evening at **Anjuna** flea market and beach.' },
      { day: 2, title: 'North Goa Tour', desc: 'Visit **Calangute**, Baga, and Vagator beaches. **Fort Aguada**. *Sunset cruise*.' },
      { day: 3, title: 'South Goa Exploration', desc: 'Drive to **Palolem** and Butterfly Beach. *Portuguese church* tour. Farewell dinner at shack.' },
      { day: 4, title: 'Departure', desc: 'Leisurely breakfast. **Airport transfer**.' }
    ],
    bestMonth: 'Nov–Feb',
    ctaBadge: 'Budget Pick',
    isBespoke: false
  },
  {
    id: 'pkg-varanasi-spiritual',
    name: 'Varanasi Spiritual Sojourn',
    duration: '2 Nights / 3 Days',
    basePrice: 23800,
    costPrice: 17500,
    taxRate: 5,
    taxInclusive: true,
    region: 'North India',
    slots: { booked: 1, total: 8 },
    trend: 'New',
    inclusionsSelection: { hotel: true, sightseeing: true, guide: true, airportTransfer: true, flight: false, meals: true },
    heroImage: 'https://images.unsplash.com/photo-1566837945700-30057527ade0',
    cardImage: 'https://images.unsplash.com/photo-1566837945700-30057527ade0',
    description: 'An **intimate spiritual journey** through the world\'s *oldest living city*. Witness the **Ganga Aarti**, walk the ancient ghats, and explore **Sarnath** where Buddha first taught.\n\n> *"Kashi: the city that is older than history, older than tradition, older even than legend."* — Mark Twain\n\nThis tour includes:\n1. **Ganga Aarti** at Dashashwamedh Ghat\n2. Early morning **boat ride** on Ganges\n3. **Sarnath** Buddhist pilgrimage\n4. **Silk weaving** workshop\n5. Authentic **Banarasi thali**',
    highlights: ['**Ganga Aarti** at Dashashwamedh Ghat', 'Early morning **boat ride** on Ganges', '**Sarnath** Buddhist pilgrimage', '*Silk weaving* workshop', 'Authentic **Banarasi thali**'],
    inclusions: ['**Heritage** hotel accommodation', 'All **meals**', 'Boat rides', 'Guide for all tours', 'Airport *transfers*', '**Silk scarf** souvenir'],
    exclusions: ['Camera fees', 'Donations at temples', 'Personal expenses', 'Insurance'],
    itinerary: [
      { day: 1, title: 'Arrival in Varanasi', desc: 'Airport pickup. Evening **Ganga Aarti** viewing from boat. **Traditional dinner**.' },
      { day: 2, title: 'Ghats & Sarnath', desc: 'Sunrise **boat ride**. **Sarnath** half-day tour. *Silk weaving* demo. Evening aarti again.' },
      { day: 3, title: 'Departure', desc: 'Breakfast at *ghat-side café*. Transfer to airport.' }
    ],
    bestMonth: 'Oct–Mar',
    ctaBadge: null,
    isBespoke: false
  }
];

const initialClients = [
  {
    id: 'cli-sharma-family',
    name: 'Ravi Sharma',
    email: 'ravi.sharma@example.com',
    phone: '+919876543210',
    status: 'Active',
    tier: 'Gold',
    historicalLtv: 178400,
    historicalBookingsCount: 3,
    avatar: null,
    preferences: { hotel: '4-star', food: 'vegetarian', roomType: 'double' },
    passport: { number: 'Z1234567', expiry: '2028-06-15', nationality: 'IN' },
    visa: null,
    emergencyContact: { name: 'Priya Sharma', phone: '+919876543211', relation: 'Spouse' },
    walletBalance: 2500,
    notes: 'Prefers window seats. Allergic to peanuts.',
    lastContact: '2026-06-10T10:30:00Z',
    logs: []
  },
  {
    id: 'cli-patel-couple',
    name: 'Anita Patel',
    email: 'anita.patel@example.com',
    phone: '+919812345678',
    status: 'Active',
    tier: 'Silver',
    historicalLtv: 89200,
    historicalBookingsCount: 1,
    avatar: null,
    preferences: { hotel: 'boutique', food: 'no-preference', roomType: 'queen' },
    passport: { number: 'A9876543', expiry: '2027-11-30', nationality: 'IN' },
    visa: null,
    emergencyContact: { name: 'Raj Patel', phone: '+919812345679', relation: 'Husband' },
    walletBalance: 500,
    notes: 'Interested in photography tours.',
    lastContact: '2026-05-28T14:00:00Z',
    logs: []
  },
  {
    id: 'cli-singh-group',
    name: 'Gurpreet Singh',
    email: 'gurpreet.singh@example.com',
    phone: '+919955443322',
    status: 'Lead',
    tier: 'Bronze',
    historicalLtv: 0,
    historicalBookingsCount: 0,
    avatar: null,
    preferences: { hotel: '3-star', food: 'non-vegetarian', roomType: 'twin' },
    passport: null,
    visa: null,
    emergencyContact: { name: 'Harjeet Kaur', phone: '+919955443323', relation: 'Mother' },
    walletBalance: 0,
    notes: 'Enquired about Himachal trip. Family of 4.',
    lastContact: '2026-06-18T09:00:00Z',
    logs: []
  },
  {
    id: 'cli-reddy-exec',
    name: 'Venkatesh Reddy',
    email: 'venky.reddy@example.com',
    phone: '+919900112233',
    status: 'Active',
    tier: 'Platinum',
    historicalLtv: 356800,
    historicalBookingsCount: 5,
    avatar: null,
    preferences: { hotel: '5-star', food: 'jain', roomType: 'suite' },
    passport: { number: 'M4455667', expiry: '2029-03-20', nationality: 'IN' },
    visa: { type: 'tourist', issuingCountry: 'US', validUntil: '2027-08-15' },
    emergencyContact: { name: 'Lakshmi Reddy', phone: '+919900112234', relation: 'Spouse' },
    walletBalance: 15000,
    notes: 'High-value client. Prefers luxury experiences. VIP treatment requested.',
    lastContact: '2026-06-20T16:45:00Z',
    logs: []
  },
  {
    id: 'cli-khan-backpacker',
    name: 'Aamir Khan',
    email: 'aamir.k@example.com',
    phone: '+919877665544',
    status: 'Active',
    tier: 'Silver',
    historicalLtv: 116800,
    historicalBookingsCount: 2,
    avatar: null,
    preferences: { hotel: 'hostel', food: 'halal', roomType: 'single' },
    passport: { number: 'K3322110', expiry: '2028-12-10', nationality: 'IN' },
    visa: null,
    emergencyContact: { name: 'Fatima Khan', phone: '+919877665545', relation: 'Sister' },
    walletBalance: 800,
    notes: 'Budget-conscious. Solo traveler. Adventure seeker.',
    lastContact: '2026-06-15T11:20:00Z',
    logs: []
  },
  {
    id: 'cli-mehta-escape',
    name: 'Neha Mehta',
    email: 'neha.mehta@example.com',
    phone: '+919898989898',
    status: 'Inactive',
    tier: 'Bronze',
    historicalLtv: 32600,
    historicalBookingsCount: 1,
    avatar: null,
    preferences: { hotel: 'resort', food: 'no-preference', roomType: 'double' },
    passport: { number: 'L7788990', expiry: '2027-05-01', nationality: 'IN' },
    visa: null,
    emergencyContact: { name: 'Arun Mehta', phone: '+919898989899', relation: 'Brother' },
    walletBalance: 200,
    notes: 'Last travelled April 2025. Needs re-engagement campaign.',
    lastContact: '2026-04-05T08:30:00Z',
    logs: []
  }
];

const initialBookings = [
  {
    id: 'bkg-001',
    client: 'Ravi Sharma',
    package: 'Kerala Backwater Escape',
    amount: 58400,
    taxAmount: 2920,
    netAmount: 61320,
    date: '2026-06-01',
    status: 'Paid',
    agent: 'Priya Mehta'
  },
  {
    id: 'bkg-002',
    client: 'Anita Patel',
    package: 'Rajasthan Royal Heritage',
    amount: 89200,
    taxAmount: 4460,
    netAmount: 93660,
    date: '2026-06-10',
    status: 'Paid',
    agent: 'Rohit Verma'
  },
  {
    id: 'bkg-003',
    client: 'Venkatesh Reddy',
    package: 'Kerala Backwater Escape',
    amount: 116800,
    taxAmount: 5840,
    netAmount: 122640,
    date: '2026-06-15',
    status: 'Pending',
    agent: 'Sunita Rao'
  },
  {
    id: 'bkg-004',
    client: 'Aamir Khan',
    package: 'Himachal Adventure Trail',
    amount: 67800,
    taxAmount: 3390,
    netAmount: 71190,
    date: '2026-07-05',
    status: 'Pending',
    agent: 'Rohit Verma'
  },
  {
    id: 'bkg-005',
    client: 'Ravi Sharma',
    package: 'Goa Beachside Bliss',
    amount: 32600,
    taxAmount: 1630,
    netAmount: 34230,
    date: '2026-07-12',
    status: 'Pending',
    agent: 'Priya Mehta'
  },
  {
    id: 'bkg-006',
    client: 'Venkatesh Reddy',
    package: 'Varanasi Spiritual Sojourn',
    amount: 23800,
    taxAmount: 1190,
    netAmount: 24990,
    date: '2026-07-20',
    status: 'Pending',
    agent: 'Sunita Rao'
  }
];

const initialUsers = [
  {
    name: 'Admin',
    email: 'admin@kraftyourtrip.com',
    password: 'admin123',
    role: 'admin',
    avatarUrl: null,
  },
];

const initialSettings = {
  defaultMarkup: 15,
  defaultAgentSplit: 40,
  agencyName: '',
  agencyAddress: '',
  agencyPhone: '',
  agencyEmail: '',
  permissions: null,
  apis: null,
  inrToUsdRate: 0
};

const initialTestimonials = [
  {
    name: 'Ravi Sharma',
    location: 'Mumbai, India',
    avatar: null,
    rating: 5,
    text: 'Absolutely stunning experience. The houseboat in Alleppey was magical — exactly what our family needed. Every detail was handled perfectly.',
    package: 'Kerala Backwater Escape',
    images: [
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1587223075055-82e9a937ddc5?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1597423498219-04418210827d?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    name: 'Anita Patel',
    location: 'Bangalore, India',
    avatar: null,
    rating: 4,
    text: 'The Rajasthan tour was incredibly well-organized. The heritage hotels were beautiful. Would have loved an extra day in Udaipur though!',
    package: 'Rajasthan Royal Heritage',
    images: [
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1592500092608-88f934b3acfa?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    name: 'Aamir Khan',
    location: 'Delhi, India',
    avatar: null,
    rating: 5,
    text: 'Himachal Adventure Trail exceeded my expectations. Paragliding in Bir and camping in Tirthan were unforgettable. Perfect for solo travelers.',
    package: 'Himachal Adventure Trail',
    images: [
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1601132359864-c974e79890ac?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    name: 'Neha Mehta',
    location: 'Pune, India',
    avatar: null,
    rating: 4,
    text: 'Goa trip was exactly the break I needed. Great resort, smooth transfers, and the sunset cruise was a highlight. Great value for money.',
    package: 'Goa Beachside Bliss',
    images: [
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&w=1000&q=80'
    ]
  }
];

async function seed() {
  try {
    console.log('Running schema migrations...');
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'testimonials' AND column_name = 'images'
        ) THEN
          ALTER TABLE testimonials ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    console.log('Clearing database tables...');
    await query('TRUNCATE packages, clients, bookings, testimonials RESTART IDENTITY CASCADE');

    console.log('Seeding packages...');
    for (const pkg of initialPackages) {
      await query(
        `INSERT INTO packages (id, name, duration, base_price, cost_price, tax_rate, tax_inclusive, region, slots_booked, slots_total, trend, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           duration = EXCLUDED.duration,
           base_price = EXCLUDED.base_price,
           cost_price = EXCLUDED.cost_price,
           tax_rate = EXCLUDED.tax_rate,
           tax_inclusive = EXCLUDED.tax_inclusive,
           region = EXCLUDED.region,
           slots_booked = EXCLUDED.slots_booked,
           slots_total = EXCLUDED.slots_total,
           trend = EXCLUDED.trend,
           inclusions_selection = EXCLUDED.inclusions_selection,
           hero_image = EXCLUDED.hero_image,
           card_image = EXCLUDED.card_image,
           description = EXCLUDED.description,
           highlights = EXCLUDED.highlights,
           inclusions = EXCLUDED.inclusions,
           exclusions = EXCLUDED.exclusions,
           itinerary = EXCLUDED.itinerary`,
        [
          pkg.id,
          pkg.name,
          pkg.duration,
          pkg.basePrice,
          pkg.costPrice ?? null,
          pkg.taxRate ?? 5,
          pkg.taxInclusive ?? true,
          pkg.region,
          pkg.slots.booked,
          pkg.slots.total,
          pkg.trend,
          JSON.stringify(pkg.inclusionsSelection),
          pkg.heroImage,
          pkg.cardImage,
          pkg.description,
          pkg.highlights,
          pkg.inclusions,
          pkg.exclusions,
          JSON.stringify(pkg.itinerary)
        ]
      );
    }

    console.log('Seeding clients...');
    for (const client of initialClients) {
      await query(
        `INSERT INTO clients (id, name, email, phone, status, tier, historical_ltv, historical_bookings_count, avatar, preferences, passport, visa, emergency_contact, wallet_balance, notes, last_contact, logs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           status = EXCLUDED.status,
           tier = EXCLUDED.tier,
           historical_ltv = EXCLUDED.historical_ltv,
           historical_bookings_count = EXCLUDED.historical_bookings_count,
           avatar = EXCLUDED.avatar,
           preferences = EXCLUDED.preferences,
           passport = EXCLUDED.passport,
           visa = EXCLUDED.visa,
           emergency_contact = EXCLUDED.emergency_contact,
           wallet_balance = EXCLUDED.wallet_balance,
           notes = EXCLUDED.notes,
           last_contact = EXCLUDED.last_contact,
           logs = EXCLUDED.logs`,
        [
          client.id,
          client.name,
          client.email,
          client.phone,
          client.status,
          client.tier,
          client.historicalLtv,
          client.historicalBookingsCount,
          client.avatar,
          JSON.stringify(client.preferences),
          JSON.stringify(client.passport),
          JSON.stringify(client.visa),
          JSON.stringify(client.emergencyContact),
          client.walletBalance,
          client.notes,
          client.lastContact,
          JSON.stringify(client.logs)
        ]
      );
    }

    console.log('Seeding bookings...');
    for (const booking of initialBookings) {
      // Find corresponding client_id and package_id by name if available
      const clientRes = await query('SELECT id FROM clients WHERE name = $1', [booking.client]);
      const pkgRes = await query('SELECT id FROM packages WHERE name = $1', [booking.package]);
      const clientId = clientRes.rows[0]?.id || null;
      const pkgId = pkgRes.rows[0]?.id || null;

      await query(
        `INSERT INTO bookings (id, client_name, client_id, package_name, package_id, amount, tax_amount, net_amount, departure_date, status, agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           client_name = EXCLUDED.client_name,
           client_id = EXCLUDED.client_id,
           package_name = EXCLUDED.package_name,
           package_id = EXCLUDED.package_id,
           amount = EXCLUDED.amount,
           tax_amount = EXCLUDED.tax_amount,
           net_amount = EXCLUDED.net_amount,
           departure_date = EXCLUDED.departure_date,
           status = EXCLUDED.status,
           agent = EXCLUDED.agent`,
        [
          booking.id,
          booking.client,
          clientId,
          booking.package,
          pkgId,
          booking.amount ?? 0,
          booking.taxAmount ?? 0,
          booking.netAmount ?? booking.amount ?? 0,
          booking.date,
          booking.status,
          booking.agent
        ]
      );
    }

    console.log('Seeding users...');
    for (const user of initialUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await query(
        `INSERT INTO users (name, email, password_hash, role, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role`,
        [user.name, user.email, passwordHash, user.role, user.avatarUrl]
      );
    }

    console.log('Seeding settings...');
    await query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['agency_settings', JSON.stringify(initialSettings)]
    );

    console.log('Seeding testimonials...');
    // Clear old testimonials since it uses auto-increment id
    await query('TRUNCATE testimonials RESTART IDENTITY');
    for (const testimonial of initialTestimonials) {
      await query(
        `INSERT INTO testimonials (name, location, avatar, rating, text, images, package)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          testimonial.name,
          testimonial.location,
          testimonial.avatar,
          testimonial.rating,
          testimonial.text,
          JSON.stringify(testimonial.images || []),
          testimonial.package
        ]
      );
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seed();
