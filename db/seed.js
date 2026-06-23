import { query } from './index.js';
import pool from './index.js';

const initialPackages = [];

const initialClients = [];

const initialBookings = [];

const initialSettings = {
  defaultMarkup: 15,
  defaultAgentSplit: 40,
  agencyName: '',
  agencyAddress: '',
  agencyPhone: '',
  agencyEmail: '',
  permissions: null,
  apis: null
};

const initialTestimonials = [];

async function seed() {
  try {
    console.log('Clearing database tables...');
    await query('TRUNCATE packages, clients, bookings, testimonials RESTART IDENTITY CASCADE');

    console.log('Seeding packages...');
    for (const pkg of initialPackages) {
      await query(
        `INSERT INTO packages (id, name, duration, base_price, cost_price, tax_rate, tax_inclusive, region, slots_booked, slots_total, trend, color, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
           color = EXCLUDED.color,
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
          pkg.color,
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
        `INSERT INTO testimonials (name, location, avatar, rating, text, package)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          testimonial.name,
          testimonial.location,
          testimonial.avatar,
          testimonial.rating,
          testimonial.text,
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
