import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

async function createAndConvertTours() {
  console.log('=== Step 1: Creating a New Direct Group Tour ===');

  // Find or create base package for direct group tour
  const directPkgId = `PKG-BALI-GROUP-${Date.now()}`;
  await query(
    `INSERT INTO packages (id, name, duration, base_price, cost_price, region, category, slots_booked, slots_total, trend, description, card_image, hero_image, highlights, inclusions, exclusions, itinerary, is_bespoke, terms_and_conditions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [
      directPkgId,
      'Bali Island & Nusa Penida Tropical Paradise',
      '6 Days / 5 Nights',
      78000,
      58000,
      'Asia',
      'standard',
      0,
      20,
      'Trending',
      'Discover the emerald rice terraces of Ubud, sacred sea temples of Uluwatu, and crystal waters of Nusa Penida with fellow travelers.',
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800',
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200',
      ['Kelingking T-Rex Beach & Broken Beach', 'Ubud Sacred Monkey Forest & Rice Terraces', 'Uluwatu Sunset Kecak Fire Dance Show', 'Mount Batur Sunrise Jeep Excursion'],
      ['4-Star Beachfront Resort Accommodations', 'Daily Buffet Breakfast & 4 Curated Dinners', 'Private AC Speedboat to Nusa Penida', 'All Entrance & Conservation Passes', 'English-Speaking Tour Guide & Escort'],
      ['International Airfare', 'Indonesian Visa on Arrival ($35)', 'Personal Laundry & Drinks'],
      JSON.stringify([
        { day: 1, title: 'Arrival in Denpasar & Ubud Resort Check-in', desc: 'Meet your group tour coordinator and transfer to scenic Ubud resort with welcome cocktails.' },
        { day: 2, title: 'Ubud Rice Terraces & Sacred Monkey Sanctuary', desc: 'Explore Tegallalang rice terraces, experience the jungle swing, and visit Ubud Palace.' },
        { day: 3, title: 'Full Day Nusa Penida Island Speedboat Adventure', desc: 'Fast ferry to Nusa Penida. Visit Kelingking Beach, Angel Billabong, and snorkel in Crystal Bay.' },
        { day: 4, title: 'Mount Batur Sunrise Jeep Tour & Natural Hot Springs', desc: 'Early morning 4WD jeep drive up the volcanic ridge of Mount Batur followed by relaxing hot springs.' },
        { day: 5, title: 'Uluwatu Clifftop Temple & Kecak Sunset Performance', desc: 'Visit Uluwatu temple perched on 70-meter cliffs and watch the dramatic Kecak fire dance.' },
        { day: 6, title: 'Seminyak Souvenir Shopping & Departure', desc: 'Free morning for beachside relaxation and Seminyak market shopping before airport transfer.' }
      ]),
      false,
      '25% deposit required to confirm. Balance payable 30 days prior to departure.'
    ]
  );

  // Insert direct group departure
  const directDepResult = await query(
    `INSERT INTO group_departures (package_id, title, departure_date, return_date, slots_total, slots_booked, price_modifier, cost_price, cta_badge, inclusions, exclusions, highlights, itinerary, status, notes, terms_and_conditions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING id, title, departure_date`,
    [
      directPkgId,
      'Bali & Nusa Penida Group Expedition — Oct 2026 Batch',
      '2026-10-18',
      '2026-10-24',
      20,
      0,
      3000,
      60000,
      'Guaranteed Departure',
      ['4-Star Beachfront Resort Accommodations', 'Daily Buffet Breakfast & 4 Curated Dinners', 'Private AC Speedboat to Nusa Penida', 'All Entrance & Conservation Passes', 'English-Speaking Tour Guide & Escort'],
      ['International Airfare', 'Indonesian Visa on Arrival', 'Personal Expenses'],
      ['Kelingking T-Rex Beach & Broken Beach', 'Ubud Sacred Monkey Forest & Rice Terraces', 'Uluwatu Sunset Kecak Fire Dance Show', 'Mount Batur Sunrise Jeep Excursion'],
      JSON.stringify([
        { day: 1, title: 'Arrival in Denpasar & Ubud Resort Check-in', desc: 'Meet your group tour coordinator and transfer to scenic Ubud resort with welcome cocktails.' },
        { day: 2, title: 'Ubud Rice Terraces & Sacred Monkey Sanctuary', desc: 'Explore Tegallalang rice terraces, experience the jungle swing, and visit Ubud Palace.' },
        { day: 3, title: 'Full Day Nusa Penida Island Speedboat Adventure', desc: 'Fast ferry to Nusa Penida. Visit Kelingking Beach, Angel Billabong, and snorkel in Crystal Bay.' },
        { day: 4, title: 'Mount Batur Sunrise Jeep Tour & Natural Hot Springs', desc: 'Early morning 4WD jeep drive up the volcanic ridge of Mount Batur followed by relaxing hot springs.' },
        { day: 5, title: 'Uluwatu Clifftop Temple & Kecak Sunset Performance', desc: 'Visit Uluwatu temple perched on 70-meter cliffs and watch the dramatic Kecak fire dance.' },
        { day: 6, title: 'Seminyak Souvenir Shopping & Departure', desc: 'Free morning for beachside relaxation and Seminyak market shopping before airport transfer.' }
      ]),
      'scheduled',
      'High season departure with guaranteed group size min 8 passengers.',
      '25% deposit required to confirm.'
    ]
  );
  console.log(`✓ Direct Group Tour Created! ID: ${directDepResult.rows[0].id} | Title: "${directDepResult.rows[0].title}"`);

  console.log('\n=== Step 2: Creating a New Normal Tour ===');
  const normalPkgId = `PKG-ICELAND-${Date.now()}`;
  await query(
    `INSERT INTO packages (id, name, duration, base_price, cost_price, region, category, slots_booked, slots_total, trend, description, card_image, hero_image, highlights, inclusions, exclusions, itinerary, is_bespoke, terms_and_conditions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [
      normalPkgId,
      'Iceland Ring Road & Aurora Borealis Odyssey',
      '8 Days / 7 Nights',
      245000,
      190000,
      'Europe',
      'standard',
      0,
      15,
      'Featured',
      'Traverse glaciers, roaring waterfalls, volcanic black sand beaches, and chase the magical Northern Lights along Iceland’s iconic Ring Road.',
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?q=80&w=800',
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?q=80&w=1200',
      ['Golden Circle: Thingvellir, Geysir & Gullfoss', 'Jokulsarlon Glacier Lagoon & Diamond Beach', 'Reynisfjara Black Sand Beach & Basalt Columns', 'Nightly Northern Lights Guided Aurora Hunts'],
      ['7 Nights Boutique Country Hotels', 'Daily Icelandic Breakfast & 5 Three-Course Dinners', 'Super Jeep Aurora Chasing Tours', 'Blue Lagoon Premium Admission with Mud Mask', 'Expert Geologist & Local Guide'],
      ['International Flights to Reykjavik (KEF)', 'Schengen Visa Fees', 'Lunches and Personal Alcoholic Drinks'],
      JSON.stringify([
        { day: 1, title: 'Arrival Reykjavik & Blue Lagoon Geothermal Spa', desc: 'Arrive at Keflavik Airport. Soak in the mineral-rich waters of Blue Lagoon before hotel check-in.' },
        { day: 2, title: 'The Golden Circle Wonders & Thingvellir', desc: 'Walk between tectonic plates at Thingvellir, marvel at Strokkur geysir eruptions and Gullfoss waterfall.' },
        { day: 3, title: 'South Coast Waterfalls & Black Sand Beach', desc: 'Visit Seljalandsfoss, Skogafoss, and the dramatic basalt cliffs of Reynisfjara near Vik.' },
        { day: 4, title: 'Skaftafell Glacier Hike & Jokulsarlon Ice Lagoon', desc: 'Crampon hike across Vatnajokull glacier and see luminous icebergs at Diamond Beach.' },
        { day: 5, title: 'East Fjords & Wilderness Aurora Watch', desc: 'Scenic drive through majestic East Fjords with evening Northern Lights watch away from light pollution.' },
        { day: 6, title: 'Lake Myvatn Volcanic Landscapes & Dimmuborgir', desc: 'Explore lava formations, bubbling mud pots of Hverir, and geothermal nature baths.' },
        { day: 7, title: 'Akureyri Whale Watching & Godafoss Waterfall', desc: 'Morning whale watching in Eyjafjordur fjord and visit Godafoss — the Waterfall of the Gods.' },
        { day: 8, title: 'Reykjavik City Walk & Homeward Bound', desc: 'Morning stroll in Reykjavik past Hallgrimskirkja and Harpa Concert Hall before airport transfer.' }
      ]),
      false,
      'Full payment required 45 days prior. Northern lights sightings subject to weather conditions.'
    ]
  );
  console.log(`✓ Normal Tour Created! Package ID: ${normalPkgId} | Name: "Iceland Ring Road & Aurora Borealis Odyssey"`);

  console.log('\n=== Step 3: Converting / Scheduling the Normal Tour into a Group Tour ===');
  const convertedDepResult = await query(
    `INSERT INTO group_departures (package_id, title, departure_date, return_date, slots_total, slots_booked, price_modifier, cost_price, cta_badge, inclusions, exclusions, highlights, itinerary, status, notes, terms_and_conditions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING id, title, departure_date`,
    [
      normalPkgId,
      'Iceland Aurora & Glacier Ring Road — Nov 2026 Batch',
      '2026-11-15',
      '2026-11-22',
      16,
      0,
      10000,
      195000,
      'Filling Fast',
      ['7 Nights Boutique Country Hotels', 'Daily Icelandic Breakfast & 5 Three-Course Dinners', 'Super Jeep Aurora Chasing Tours', 'Blue Lagoon Premium Admission with Mud Mask', 'Expert Geologist & Local Guide'],
      ['International Flights', 'Schengen Visa', 'Personal Expenses'],
      ['Golden Circle: Thingvellir, Geysir & Gullfoss', 'Jokulsarlon Glacier Lagoon & Diamond Beach', 'Reynisfjara Black Sand Beach & Basalt Columns', 'Nightly Northern Lights Guided Aurora Hunts'],
      JSON.stringify([
        { day: 1, title: 'Arrival Reykjavik & Blue Lagoon Geothermal Spa', desc: 'Arrive at Keflavik Airport. Soak in the mineral-rich waters of Blue Lagoon before hotel check-in.' },
        { day: 2, title: 'The Golden Circle Wonders & Thingvellir', desc: 'Walk between tectonic plates at Thingvellir, marvel at Strokkur geysir eruptions and Gullfoss waterfall.' },
        { day: 3, title: 'South Coast Waterfalls & Black Sand Beach', desc: 'Visit Seljalandsfoss, Skogafoss, and the dramatic basalt cliffs of Reynisfjara near Vik.' },
        { day: 4, title: 'Skaftafell Glacier Hike & Jokulsarlon Ice Lagoon', desc: 'Crampon hike across Vatnajokull glacier and see luminous icebergs at Diamond Beach.' },
        { day: 5, title: 'East Fjords & Wilderness Aurora Watch', desc: 'Scenic drive through majestic East Fjords with evening Northern Lights watch away from light pollution.' },
        { day: 6, title: 'Lake Myvatn Volcanic Landscapes & Dimmuborgir', desc: 'Explore lava formations, bubbling mud pots of Hverir, and geothermal nature baths.' },
        { day: 7, title: 'Akureyri Whale Watching & Godafoss Waterfall', desc: 'Morning whale watching in Eyjafjordur fjord and visit Godafoss — the Waterfall of the Gods.' },
        { day: 8, title: 'Reykjavik City Walk & Homeward Bound', desc: 'Morning stroll in Reykjavik past Hallgrimskirkja and Harpa Concert Hall before airport transfer.' }
      ]),
      'scheduled',
      'Peak Aurora season departure with winterized Super Jeep transport.',
      'Schengen visa required before departure.'
    ]
  );
  console.log(`✓ Converted Normal Tour to Group Tour! Departure ID: ${convertedDepResult.rows[0].id} | Title: "${convertedDepResult.rows[0].title}"`);

  console.log('\n=== Step 4: Verification of Updated Group Tours List ===');
  const allDeps = await query(`
    SELECT gd.id, gd.title, p.name AS package_name, gd.departure_date, gd.status, gd.slots_total, gd.price_modifier
    FROM group_departures gd
    LEFT JOIN packages p ON p.id = gd.package_id
    ORDER BY gd.id DESC LIMIT 4
  `);

  console.log('Latest Group Departures in Database:');
  allDeps.rows.forEach(r => {
    console.log(`  • [ID: ${r.id}] "${r.title}" (Base Pkg: "${r.package_name}") | Date: ${r.departure_date} | Slots: ${r.slots_total} | Price Mod: ₹${r.price_modifier}`);
  });

  console.log('\n✅ All operations completed successfully!');
  process.exit(0);
}

createAndConvertTours().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
