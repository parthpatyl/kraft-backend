import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';

const router = Router();

// GET /api/stats (Public)
router.get('/', async (req, res, next) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'agency_stats'");
    
    const defaults = {
      tripsCrafted: 500,
      satisfaction: 98,
      destinations: 50
    };

    if (result.rows.length === 0) {
      return res.json(defaults);
    }

    // Parse the retrieved values to ensure they are integers
    const rawVal = result.rows[0].value;
    const stats = {
      tripsCrafted: parseInt(String(rawVal.tripsCrafted).replace(/\D/g, ''), 10) || defaults.tripsCrafted,
      satisfaction: parseInt(String(rawVal.satisfaction).replace(/\D/g, ''), 10) || defaults.satisfaction,
      destinations: parseInt(String(rawVal.destinations).replace(/\D/g, ''), 10) || defaults.destinations
    };
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// PUT /api/stats (Restricted to employees with write:testimonials permission)
router.put('/', requirePermission('write:testimonials'), async (req, res, next) => {
  try {
    const { tripsCrafted, satisfaction, destinations } = req.body;
    
    // Simple validation
    if (tripsCrafted === undefined || satisfaction === undefined || destinations === undefined) {
      return res.status(400).json({ error: 'All stats fields (tripsCrafted, satisfaction, destinations) are required' });
    }

    // Strip symbols and convert to integer
    const trips = parseInt(String(tripsCrafted).replace(/\D/g, ''), 10);
    const sat = parseInt(String(satisfaction).replace(/\D/g, ''), 10);
    const dest = parseInt(String(destinations).replace(/\D/g, ''), 10);

    if (isNaN(trips) || isNaN(sat) || isNaN(dest)) {
      return res.status(400).json({ error: 'Stats values must contain valid integer numbers' });
    }

    const value = {
      tripsCrafted: trips,
      satisfaction: sat,
      destinations: dest
    };

    const result = await query(
      `INSERT INTO settings (key, value)
       VALUES ('agency_stats', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(value)]
    );

    res.json(result.rows[0].value);
  } catch (error) {
    next(error);
  }
});

export default router;
