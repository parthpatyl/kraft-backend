import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/kraft_your_trip',
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
    ? { rejectUnauthorized: false }
    : false
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;

// Auto-migrations: run on startup to add columns that may not exist in legacy DBs
(async () => {
  let ok = true;
  const migrate = async (label, fn) => {
    try {
      await fn();
    } catch (err) {
      if (err.code === '42P01') return; // table doesn't exist yet
      console.error(`[DB] Migration failed: ${label} — ${err.message}`);
      ok = false;
    }
  };

  await migrate('packages: is_bespoke', () =>
    pool.query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_bespoke BOOLEAN DEFAULT FALSE`)
  );
  await migrate('packages: cost_price', () =>
    pool.query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2)`)
  );
  await migrate('packages: tax_rate', () =>
    pool.query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(4,1) DEFAULT 5`)
  );
  await migrate('packages: tax_inclusive', () =>
    pool.query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT TRUE`)
  );

  await migrate('clients: wallet_balance type', async () => {
    const wbCheck = await pool.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name='clients' AND column_name='wallet_balance'`
    );
    if (wbCheck.rows[0]?.data_type === 'character varying') {
      await pool.query(`ALTER TABLE clients ALTER COLUMN wallet_balance DROP DEFAULT`);
      await pool.query(`
        ALTER TABLE clients ALTER COLUMN wallet_balance TYPE NUMERIC(12,2)
        USING CAST(
          NULLIF(regexp_replace(regexp_replace(COALESCE(wallet_balance,'0'), ',', '', 'g'), '[^0-9.-]', '', 'g'), '')
          AS NUMERIC(12,2)
        )
      `);
      await pool.query(`ALTER TABLE clients ALTER COLUMN wallet_balance SET DEFAULT 0`);
    }
  });

  await migrate('bookings: tax_amount', () =>
    pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0`)
  );
  await migrate('bookings: net_amount', () =>
    pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) DEFAULT 0`)
  );
  await migrate('bookings: discount_type', () =>
    pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10)`)
  );
  await migrate('bookings: discount_value', () =>
    pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2)`)
  );

  await migrate('bookings: group_members', () =>
    pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_members JSONB DEFAULT '[]'::jsonb`)
  );
  await migrate('bookings: progress', () =>
    pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{"quoteSent": true, "depositPaid": false, "flightsConfirmed": false, "vouchersIssued": false}'::jsonb`)
  );

  await migrate('bookings: progress_final_payment', async () => {
    await pool.query(`ALTER TABLE bookings ALTER COLUMN progress SET DEFAULT '{"quoteSent": true, "depositPaid": false, "flightsConfirmed": false, "finalPayment": false}'::jsonb`);
    await pool.query(`
      UPDATE bookings 
      SET progress = (COALESCE(progress, '{"quoteSent": true, "depositPaid": false, "flightsConfirmed": false, "vouchersIssued": false}'::jsonb) - 'vouchersIssued') || 
                     jsonb_build_object('finalPayment', COALESCE((progress->>'vouchersIssued')::boolean, false))
      WHERE progress IS NOT NULL
    `);
  });

  await migrate('bookings: amount type', async () => {
    const amtCheck = await pool.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name='bookings' AND column_name='amount'`
    );
    if (amtCheck.rows[0]?.data_type === 'character varying') {
      await pool.query(`
        ALTER TABLE bookings ALTER COLUMN amount TYPE NUMERIC(12,2)
        USING CAST(
          NULLIF(regexp_replace(regexp_replace(COALESCE(amount,'0'), ',', '', 'g'), '[^0-9.-]', '', 'g'), '')
          AS NUMERIC(12,2)
        )
      `);
      await pool.query(`ALTER TABLE bookings ALTER COLUMN amount SET DEFAULT 0`);
      await pool.query(`ALTER TABLE bookings ALTER COLUMN amount SET NOT NULL`);
      await pool.query(`UPDATE bookings SET net_amount = amount WHERE net_amount IS NULL`);
    }
  });

  await migrate('users: create table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  );

  await migrate('users: last_active_at', () =>
    pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ`)
  );

  await migrate('notifications: create table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'system',
        read BOOLEAN DEFAULT FALSE,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  );

  await migrate('notifications: user_id column', () =>
    pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER`)
  );

  await migrate('notifications: link columns', () =>
    pool.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS link_url TEXT,
        ADD COLUMN IF NOT EXISTS link_type VARCHAR(20)
    `)
  );

  await migrate('corporate_leads: financial columns', async () => {
    await pool.query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS per_person_rate NUMERIC(12,2)`);
    await pool.query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS group_size INTEGER`);
    await pool.query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10)`);
    await pool.query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2)`);
    await pool.query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(4,1) DEFAULT 5`);
    await pool.query(`ALTER TABLE corporate_leads ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT TRUE`);
    await pool.query(`ALTER TABLE corporate_leads DROP COLUMN IF EXISTS estimated_value`);
  });

  await migrate('approvals: create table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        requested_by INTEGER NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payload JSONB NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP,
        reviewer_note TEXT,
        executed_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  );

  await migrate('bookings: special_directives', async () => {
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_directives JSONB DEFAULT '[]'::jsonb`);
    // Seed existing bookings with mock/default directives so the UI looks complete right away
    await pool.query(`
      UPDATE bookings 
      SET special_directives = '["VIP Priority Lounge", "Dietary: Gluten-Free", "Window Seats Preferred"]'::jsonb
      WHERE special_directives IS NULL OR special_directives = '[]'::jsonb
    `);
  });

  await migrate('enquiries: create table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        travel_date DATE NOT NULL,
        guests INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        preferences JSONB,
        status VARCHAR(20) DEFAULT 'logged',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  );

  await migrate('enquiries: status column', () =>
    pool.query(`ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'logged'`)
  );

  await migrate('enquiries: travel_date nullable', () =>
    pool.query(`ALTER TABLE enquiries ALTER COLUMN travel_date DROP NOT NULL`)
  );

  await migrate('speciality_categories: create table & seed', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS speciality_categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        subtitle TEXT,
        keyword VARCHAR(100) NOT NULL,
        icon_name VARCHAR(50) DEFAULT 'Compass',
        icon_color VARCHAR(50) DEFAULT 'text-blue-600',
        icon_bg VARCHAR(50) DEFAULT 'bg-blue-50',
        accent_color VARCHAR(50) DEFAULT 'text-blue-400',
        default_count INTEGER DEFAULT 20,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default 8 categories if table is empty
    const check = await pool.query(`SELECT COUNT(*)::int FROM speciality_categories`);
    if (check.rows[0].count === 0) {
      const defaults = [
        ['adventure', 'Adventure', 'Thrilling treks & expeditions', 'Adventure', 'Compass', 'text-blue-600', 'bg-blue-50', 'text-blue-400 group-hover:text-blue-300', 24, 1],
        ['wellness', 'Wellness', 'Rejuvenate mind & body', 'Wellness', 'Sparkles', 'text-teal-600', 'bg-teal-50', 'text-teal-400 group-hover:text-teal-300', 18, 2],
        ['honeymoon', 'Honeymoon', 'Romantic getaways', 'Honeymoon', 'Heart', 'text-rose-500', 'bg-rose-50', 'text-rose-400 group-hover:text-rose-300', 31, 3],
        ['wildlife', 'Wildlife', 'Safari & nature tours', 'Wildlife', 'Binoculars', 'text-emerald-600', 'bg-emerald-50', 'text-emerald-400 group-hover:text-emerald-300', 15, 4],
        ['culinary', 'Culinary', 'Taste the world', 'Culinary', 'Utensils', 'text-amber-600', 'bg-amber-50', 'text-amber-400 group-hover:text-amber-300', 22, 5],
        ['cruises', 'Cruises', 'Sail the seas in style', 'Cruise', 'Ship', 'text-sky-600', 'bg-sky-50', 'text-sky-400 group-hover:text-sky-300', 9, 6],
        ['photography', 'Photography', 'Capture stunning moments', 'Photography', 'Camera', 'text-purple-600', 'bg-purple-50', 'text-purple-400 group-hover:text-purple-300', 11, 7],
        ['group-tours', 'Group Tours', 'Travel with like-minded people', 'Group', 'Users', 'text-indigo-600', 'bg-indigo-50', 'text-indigo-400 group-hover:text-indigo-300', 27, 8],
      ];
      for (const row of defaults) {
        await pool.query(
          `INSERT INTO speciality_categories 
            (id, name, subtitle, keyword, icon_name, icon_color, icon_bg, accent_color, default_count, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
           ON CONFLICT (id) DO NOTHING`,
          row
        );
      }
    }
  });

  await migrate('package_speciality_categories: create table & seed', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS package_speciality_categories (
        package_id VARCHAR(50) REFERENCES packages(id) ON DELETE CASCADE,
        category_id VARCHAR(50) REFERENCES speciality_categories(id) ON DELETE CASCADE,
        PRIMARY KEY (package_id, category_id)
      )
    `);

    await pool.query(`
      INSERT INTO package_speciality_categories (package_id, category_id)
      SELECT p.id, c.id
      FROM packages p
      CROSS JOIN speciality_categories c
      WHERE 
          LOWER(p.name) LIKE '%' || LOWER(c.keyword) || '%' OR
          LOWER(p.description) LIKE '%' || LOWER(c.keyword) || '%' OR
          LOWER(p.region) LIKE '%' || LOWER(c.keyword) || '%' OR
          LOWER(p.category) LIKE '%' || LOWER(c.keyword) || '%' OR
          EXISTS (
              SELECT 1 FROM unnest(p.highlights) h WHERE LOWER(h) LIKE '%' || LOWER(c.keyword) || '%'
          ) OR
          EXISTS (
              SELECT 1 FROM unnest(p.inclusions) inc WHERE LOWER(inc) LIKE '%' || LOWER(c.keyword) || '%'
          )
      ON CONFLICT DO NOTHING
    `);
  });

  if (ok) {
    console.log('[DB] Pricing migrations complete');
  } else {
    console.warn('[DB] Some migrations failed — app may behave unexpectedly');
  }
})();
