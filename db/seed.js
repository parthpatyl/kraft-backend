import { query } from './index.js';
import pool from './index.js';
import bcrypt from 'bcryptjs';

const initialPackages = [];

const initialClients = [];

const initialBookings = [];

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

const initialTestimonials = [];

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

    // Add type column to testimonials
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'testimonials' AND column_name = 'type'
        ) THEN
          ALTER TABLE testimonials ADD COLUMN type VARCHAR(20) DEFAULT 'consumer';
        END IF;
      END $$;
    `);

    // Add company column to testimonials
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'testimonials' AND column_name = 'company'
        ) THEN
          ALTER TABLE testimonials ADD COLUMN company VARCHAR(255);
        END IF;
      END $$;
    `);

    // Add category column to packages
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'packages' AND column_name = 'category'
        ) THEN
          ALTER TABLE packages ADD COLUMN category VARCHAR(50) DEFAULT 'standard';
        END IF;
      END $$;
    `);

    // Create group_departures table
    await query(`
      CREATE TABLE IF NOT EXISTS group_departures (
        id SERIAL PRIMARY KEY,
        package_id VARCHAR(50) REFERENCES packages(id) ON DELETE CASCADE,
        title VARCHAR(255),
        departure_date DATE NOT NULL,
        return_date DATE,
        slots_total INTEGER NOT NULL DEFAULT 20,
        slots_booked INTEGER DEFAULT 0,
        price_modifier NUMERIC(12,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add departure_id to bookings
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bookings' AND column_name = 'departure_id'
        ) THEN
          ALTER TABLE bookings ADD COLUMN departure_id INTEGER REFERENCES group_departures(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create corporate packages table
    await query(`
      CREATE TABLE IF NOT EXISTS corporate_packages (
        id SERIAL PRIMARY KEY,
        destination VARCHAR(255) NOT NULL,
        nights VARCHAR(50),
        starting_price NUMERIC(10,2),
        category VARCHAR(50) NOT NULL CHECK (category IN ('india', 'international')),
        image_url TEXT,
        description TEXT,
        highlights TEXT[],
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create corporate leads table
    await query(`
      CREATE TABLE IF NOT EXISTS corporate_leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        work_email VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'new',
        per_person_rate NUMERIC(12,2),
        group_size INTEGER,
        discount_type VARCHAR(10),
        discount_value NUMERIC(10,2),
        tax_rate NUMERIC(4,1) DEFAULT 5,
        tax_inclusive BOOLEAN DEFAULT TRUE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add financial columns if missing (for existing databases)
    await query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS per_person_rate NUMERIC(12,2);`);
    await query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS group_size INTEGER;`);
    await query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10);`);
    await query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2);`);
    await query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(4,1) DEFAULT 5;`);
    await query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE corporate_leads DROP COLUMN IF EXISTS estimated_value;`);

    // Create corporate clients table
    await query(`
      CREATE TABLE IF NOT EXISTS corporate_clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        industry VARCHAR(255),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      );
    `);

    console.log('Clearing database tables...');
    await query('TRUNCATE packages, clients, bookings, testimonials RESTART IDENTITY CASCADE');

    console.log('Seeding packages...');
    for (const pkg of initialPackages) {
      await query(
        `INSERT INTO packages (id, name, duration, base_price, cost_price, tax_rate, tax_inclusive, region, category, slots_booked, slots_total, trend, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           duration = EXCLUDED.duration,
           base_price = EXCLUDED.base_price,
           cost_price = EXCLUDED.cost_price,
           tax_rate = EXCLUDED.tax_rate,
           tax_inclusive = EXCLUDED.tax_inclusive,
           region = EXCLUDED.region,
           category = EXCLUDED.category,
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
          pkg.category ?? 'standard',
          0,
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

    console.log('Seeding group departures...');
    const departureData = [];
    for (const dd of departureData) {
      await query(
        `INSERT INTO group_departures (package_id, title, departure_date, return_date, slots_total, slots_booked, price_modifier, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [dd.packageId, dd.title, dd.departureDate, dd.returnDate, dd.slotsTotal, 0, dd.priceModifier, dd.status]
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
        `INSERT INTO testimonials (name, location, avatar, rating, text, images, package, type, company)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testimonial.name,
          testimonial.location,
          testimonial.avatar,
          testimonial.rating,
          testimonial.text,
          JSON.stringify(testimonial.images || []),
          testimonial.package,
          testimonial.type || 'consumer',
          testimonial.company || ''
        ]
      );
    }

    console.log('Seeding corporate packages...');
    const corporatePackages = [];
    await query('TRUNCATE corporate_packages RESTART IDENTITY');
    for (const pkg of corporatePackages) {
      await query(
        `INSERT INTO corporate_packages (destination, nights, starting_price, category, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [pkg.destination, pkg.nights, pkg.startingPrice, pkg.category, pkg.description]
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
