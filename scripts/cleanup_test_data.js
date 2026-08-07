import pool from '../db/index.js';

async function cleanup() {
  try {
    const res = await pool.query(
      "DELETE FROM testimonials WHERE name IN ('Elena Rostova', 'Vikram Sharma') RETURNING *"
    );
    console.log(`Cleaned up ${res.rows.length} test trip stories from database.`);
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err.message);
    process.exit(1);
  }
}

cleanup();
