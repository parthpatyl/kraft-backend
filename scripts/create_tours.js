import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const token = jwt.sign({ id: 1, name: 'Admin', email: 'admin@kraftyourtrip.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });

const normalPkg = {
  id: 'PKG-SWISS-ALPS-01',
  name: 'Swiss Alps & Glacier Wonders Odyssey',
  duration: '7 Days / 6 Nights',
  basePrice: 185000,
  costPrice: 140000,
  taxRate: 5,
  taxInclusive: true,
  region: 'Europe',
  category: 'standard',
  slots: { booked: 0, total: 25 },
  trend: 'Best Seller',
  heroImage: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200',
  cardImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600',
  description: 'Experience the majestic beauty of the Swiss Alps, from Zurich to the snow-capped peaks of Jungfraujoch and the scenic Glacier Express through Zermatt.',
  highlights: [
    'Scenic journey on the Glacier Express panorama train',
    'Summit excursion to Jungfraujoch — Top of Europe (3,454m)',
    'Walking tour of historic Lucerne and Chapel Bridge',
    'Lake Geneva sunset catamaran cruise with Swiss fondue dinner'
  ],
  inclusions: [
    '4-Star premium alpine hotel accommodations (6 Nights)',
    'Daily Swiss buffet breakfasts & 4 curated regional dinners',
    'Swiss Travel Pass (1st Class) with panoramic Glacier Express reservation',
    'All mountain railway & cable car passes (Jungfraujoch, Titlis, Matterhorn Glacier Paradise)',
    'Dedicated English-speaking professional tour director'
  ],
  exclusions: [
    'International roundtrip airfare',
    'Schengen visa processing fees',
    'Personal expenses & optional adventure activities (paragliding, helicopter tour)',
    'Travel and medical insurance'
  ],
  itinerary: [
    {
      day: 1,
      title: 'Arrival in Zurich & Transfer to Lucerne',
      desc: 'Arrive at Zurich Airport (ZRH). Meet your tour manager and take a scenic 1st class train to Lucerne. Enjoy an evening welcome orientation and a stroll along the historic Chapel Bridge.'
    },
    {
      day: 2,
      title: 'Mount Titlis Glacier & Rotair Cable Car',
      desc: 'Ascend Mount Titlis aboard the world\'s first revolving cable car, the Titlis Rotair. Walk across the Titlis Cliff Walk suspension bridge and explore the illuminated Glacier Cave.'
    },
    {
      day: 3,
      title: 'Interlaken & Journey to Jungfraujoch — Top of Europe',
      desc: 'Travel through the Bernese Oberland to Lauterbrunnen. Board the cogwheel railway to Jungfraujoch (3,454m). Visit the Sphinx Observatory and Ice Palace.'
    },
    {
      day: 4,
      title: 'Glacier Express Panorama Train to Zermatt',
      desc: 'Board the world-famous Glacier Express for a breathtaking 4.5-hour journey over 291 bridges and through 91 tunnels. Arrive in the car-free mountain haven of Zermatt.'
    },
    {
      day: 5,
      title: 'Matterhorn Glacier Paradise & Alpine Hike',
      desc: 'Take Europe\'s highest 3S cableway to Matterhorn Glacier Paradise (3,883m) for 360-degree panoramic views of 38 alpine peaks across Switzerland, Italy, and France.'
    },
    {
      day: 6,
      title: 'Lake Geneva, Montreux & Chillon Castle',
      desc: 'Travel west to Montreux along the Swiss Riviera. Visit the medieval Château de Chillon on Lake Geneva and savor an authentic Swiss cheese fondue dinner.'
    },
    {
      day: 7,
      title: 'Geneva Departure & Homeward Bound',
      desc: 'Morning leisure stroll along Lake Geneva\'s promenade. Guided group transfer to Geneva International Airport (GVA) for your return flight home.'
    }
  ],
  bestMonth: 'May - Oct',
  ctaBadge: 'Popular Choice',
  isBespoke: false,
  termsAndConditions: '### Booking & Cancellation Terms\n- **Deposit**: 30% advance required upon confirmation.\n- **Cancellation**: Full refund up to 30 days prior to departure; 50% refund between 15-29 days; non-refundable within 14 days.\n- **Passports**: Must be valid for at least 6 months beyond the travel dates.'
};

async function run() {
  console.log('1. Creating Normal Tour Package...');
  const pkgRes = await fetch('http://localhost:5000/api/packages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(normalPkg)
  });

  const createdPkg = await pkgRes.json();
  console.log('Package created:', pkgRes.status, createdPkg.id, createdPkg.name);

  console.log('2. Creating Linked Group Tour Departure...');
  const groupDep = {
    packageId: createdPkg.id,
    title: 'Swiss Alps Autumn Panorama — Oct 2026 Batch',
    departureDate: '2026-10-10',
    returnDate: '2026-10-16',
    slots: {
      booked: 6,
      total: 20
    },
    priceModifier: 5000,
    costPrice: 142000,
    ctaBadge: 'Guaranteed Departure',
    inclusions: [
      '4-Star Hotels',
      'Daily Breakfast & Dinner',
      'Swiss Pass 1st Class',
      'Jungfraujoch & Titlis Tickets',
      'Dedicated Tour Manager'
    ],
    exclusions: [
      'International Flights',
      'Schengen Visa',
      'Travel Insurance',
      'Personal Shopping'
    ],
    itinerary: [
      {
        day: 1,
        title: 'Arrival in Zurich & Transfer to Lucerne',
        desc: 'Flight arrival at Zurich Airport (ZRH) by 11:00 AM. Group coach transfer to Lucerne 4-star hotel. Evening welcome dinner on Lake Lucerne.'
      },
      {
        day: 2,
        title: 'Mt. Titlis Rotating Cable Car & Cliff Walk',
        desc: 'Morning ascent to Mt. Titlis with private guide. Afternoon Lucerne Old Town walking tour and lake promenade stroll.'
      },
      {
        day: 3,
        title: 'Jungfraujoch Summit Excursion',
        desc: 'Full-day excursion to Jungfraujoch (3,454m) with cogwheel train ride and panoramic lunch at the Top of Europe summit.'
      },
      {
        day: 4,
        title: 'Glacier Express Panorama Ride to Zermatt',
        desc: 'Exclusive panoramic coach reserved on the Glacier Express to Zermatt under the Matterhorn.'
      },
      {
        day: 5,
        title: 'Matterhorn Glacier Paradise Exploration',
        desc: 'Morning cable car ride to 3,883m Matterhorn Glacier Paradise. Afternoon chocolate & cheese tasting in Zermatt village.'
      },
      {
        day: 6,
        title: 'Montreux, Chillon Castle & Fondue Dinner',
        desc: 'Scenic rail transfer to Lake Geneva. Private guided tour of Chillon Castle followed by lakeside fondue evening.'
      },
      {
        day: 7,
        title: 'Geneva Airport Drop-off & Departure',
        desc: 'Group transfer to Geneva Airport (GVA) for flights departing after 2:00 PM.'
      }
    ],
    status: 'scheduled',
    notes: 'Direct group flight on Swiss International Air Lines (SWISS) from Mumbai/Delhi available. Tour manager joins at Zurich airport.',
    termsAndConditions: '### Group Departure Terms\n- **Minimum Group Size**: 10 passengers (Status: Guaranteed).\n- **Baggage Allowance**: 1 check-in bag (23kg) + 1 cabin bag (7kg) per guest.\n- **Payment Schedule**: 50% due 45 days prior, final balance due 21 days prior to departure.'
  };

  const depRes = await fetch('http://localhost:5000/api/group-departures', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(groupDep)
  });

  const createdDep = await depRes.json();
  console.log('Group Departure created:', depRes.status, createdDep.id, createdDep.title);
  console.log('All Tours created successfully!');
}

run().catch(console.error);
