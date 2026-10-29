import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';
import { DEFAULT_NAVIGATION_MENU } from '../data/defaultNavigation.js';

const router = Router();

// GET /api/navigation - Public endpoint for customer site & admin
router.get('/', async (req, res, next) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'navigation_menu'");
    if (result.rows && result.rows.length > 0 && result.rows[0].value) {
      return res.json(result.rows[0].value);
    }

    // Auto-seed default navigation if not yet present in database
    await query(
      `INSERT INTO settings (key, value)
       VALUES ('navigation_menu', $1)
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(DEFAULT_NAVIGATION_MENU)]
    );

    res.json(DEFAULT_NAVIGATION_MENU);
  } catch (error) {
    next(error);
  }
});

// PUT /api/navigation - Update navigation hierarchy (admin/manager with write:settings)
router.put('/', requirePermission('write:settings'), async (req, res, next) => {
  try {
    const newMenu = Array.isArray(req.body) ? req.body : req.body?.menu;
    if (!Array.isArray(newMenu)) {
      return res.status(400).json({ error: 'Navigation menu data must be an array' });
    }

    const result = await query(
      `INSERT INTO settings (key, value)
       VALUES ('navigation_menu', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(newMenu)]
    );

    res.json(result.rows[0].value);
  } catch (error) {
    next(error);
  }
});

// POST /api/navigation/reset - Reset navigation menu back to original defaults
router.post('/reset', requirePermission('write:settings'), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO settings (key, value)
       VALUES ('navigation_menu', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(DEFAULT_NAVIGATION_MENU)]
    );

    res.json(result.rows[0].value);
  } catch (error) {
    next(error);
  }
});

export default router;
