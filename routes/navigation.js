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
    let newMenu = Array.isArray(req.body) ? req.body : req.body?.menu;
    if (!Array.isArray(newMenu)) {
      return res.status(400).json({ error: 'Navigation menu data must be an array' });
    }

    // If tourHighlights / highlights were passed at top level in an object wrapper, embed them into dropdown item (e.g. group_tours)
    const rootHighlights = req.body?.tourHighlights || req.body?.highlights;
    if (!Array.isArray(req.body) && Array.isArray(rootHighlights)) {
      newMenu = newMenu.map((item) => {
        if (item.id === 'group_tours' || item.type === 'dropdown') {
          return { ...item, tourHighlights: rootHighlights };
        }
        return item;
      });
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

const DEFAULT_DESTINATION_CAROUSEL = [
  { id: 'switzerland', name: 'Switzerland', region: 'Europe', search: 'Switzerland', image: '/assets/unsplash-swiss-alps.jpg', tourCount: '2 tours', isActive: true },
  { id: 'japan', name: 'Japan', region: 'Asia', search: 'Japan', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80', tourCount: '3 tours', isActive: true },
  { id: 'dubai', name: 'Dubai & UAE', region: 'Middle East', search: 'Dubai', image: '/assets/unsplash-dubai.jpg', tourCount: 'Coming soon', isActive: true },
  { id: 'bali', name: 'Bali & Indo', region: 'Asia', search: 'Bali', image: '/assets/unsplash-bali.jpg', tourCount: '3 tours', isActive: true },
  { id: 'greece', name: 'Greece', region: 'Europe', search: 'Greece', image: '/assets/unsplash-greece.jpg', tourCount: '2 tours', isActive: true },
  { id: 'italy', name: 'Italy & Amalfi', region: 'Europe', search: 'Italy', image: '/assets/unsplash-amalfi.jpg', tourCount: '2 tours', isActive: true },
  { id: 'iceland', name: 'Iceland', region: 'Europe', search: 'Iceland', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80', tourCount: '2 tours', isActive: true },
  { id: 'kashmir', name: 'Kashmir, India', region: 'India', search: 'Kashmir', image: '/assets/unsplash-kashmir.png', tourCount: '1 tour', isActive: true },
  { id: 'africa', name: 'Serengeti Safari', region: 'Africa', search: 'Safari', image: '/assets/unsplash-african-safari.jpg', tourCount: '1 tour', isActive: true },
  { id: 'vietnam', name: 'Vietnam', region: 'Asia', search: 'Vietnam', image: '/assets/unsplash-pkg-card.jpg', tourCount: '3 tours', isActive: true }
];

// GET /api/navigation/carousel - Destination carousel items
router.get('/carousel', async (req, res, next) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'destination_carousel'");
    if (result.rows && result.rows.length > 0 && result.rows[0].value) {
      return res.json(result.rows[0].value);
    }
    res.json(DEFAULT_DESTINATION_CAROUSEL);
  } catch (error) {
    next(error);
  }
});

// PUT /api/navigation/carousel - Update destination carousel items (admin/manager with write:settings)
router.put('/carousel', requirePermission('write:settings'), async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body?.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Destination carousel data must be an array' });
    }

    const result = await query(
      `INSERT INTO settings (key, value)
       VALUES ('destination_carousel', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(items)]
    );

    res.json(result.rows[0].value);
  } catch (error) {
    next(error);
  }
});

export default router;
