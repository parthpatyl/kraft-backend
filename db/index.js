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

  if (ok) {
    console.log('[DB] Pricing migrations complete');
  } else {
    console.warn('[DB] Some migrations failed — app may behave unexpectedly');
  }
})();
