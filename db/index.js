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

  await migrate('notifications: create table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'system',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  );

  if (ok) {
    console.log('[DB] Pricing migrations complete');
  } else {
    console.warn('[DB] Some migrations failed — app may behave unexpectedly');
  }
})();
