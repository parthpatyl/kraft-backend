import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

// GET settings
router.get('/', async (req, res, next) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
    const defaultSettings = {
      defaultMarkup: 15,
      defaultAgentSplit: 40,
      agencyName: 'KRAFT YOUR TRIP',
      agencyAddress: '456 Sandstone Ave, Suite 100, San Francisco, CA',
      agencyPhone: '+1 (555) 019-2831',
      agencyEmail: 'concierge@kraftyourtrip.com',
      permissions: {
        admin: { viewFinancials: true, editPricing: true, supplierCreds: true, clientScans: true },
        manager: { viewFinancials: true, editPricing: true, supplierCreds: false, clientScans: true },
        agent: { viewFinancials: false, editPricing: false, supplierCreds: false, clientScans: true }
      },
      apis: {
        sabre: { connected: true, endpoint: 'https://api.sabre.com/v2/flights', key: '••••••••••••••••••••' },
        amadeus: { connected: false, endpoint: 'https://api.amadeus.com/v1/booking', key: '' },
        bedbank: { connected: true, endpoint: 'https://api.hotelbeds.com/hotel/v3', key: '••••••••••••••••••••' }
      },
      specialOffers: [
        {
          id: '1',
          title: 'Maldives Paradise Escape',
          subtitle: 'Book a luxury 5-day overwater villa stay and receive a complimentary couples spa treatment.',
          imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1000&q=80',
          buttonText: 'View Packages',
          targetPage: 'destinations'
        },
        {
          id: '2',
          title: 'Swiss Alps Hiking Adventure',
          subtitle: 'Save 15% on summer alpine trekking guides and luxury chalet lodging.',
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
          buttonText: 'Inquire Now',
          targetPage: 'booking'
        }
      ]
    };

    if (result.rows.length === 0) {
      return res.json(defaultSettings);
    }
    const merged = { ...defaultSettings, ...result.rows[0].value };
    if (!merged.specialOffers) {
      merged.specialOffers = defaultSettings.specialOffers;
    }
    res.json(merged);
  } catch (error) {
    next(error);
  }
});

// PUT update settings
router.put('/', async (req, res, next) => {
  try {
    const newValue = req.body;

    const result = await query(
      `INSERT INTO settings (key, value)
       VALUES ('agency_settings', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(newValue)]
    );

    res.json(result.rows[0].value);
  } catch (error) {
    next(error);
  }
});

export default router;
