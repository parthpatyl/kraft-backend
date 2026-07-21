import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';
import { roleHas } from '../middleware/permissions.js';
import jwt from 'jsonwebtoken';

const router = Router();

function tryDecodeUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

// GET settings
router.get('/', async (req, res, next) => {
  try {
    const user = tryDecodeUser(req);
    if (user && !roleHas(user.role, 'read:settings')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [settingsRes, weatherRes] = await Promise.all([
      query("SELECT value FROM settings WHERE key = 'agency_settings'"),
      query("SELECT value FROM settings WHERE key = 'weather_cache'")
    ]);

    const defaultSettings = {
      defaultMarkup: 15,
      defaultAgentSplit: 40,
      inrToUsdRate: 0,
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
          imageUrl: '/assets/unsplash-maldives.jpg',
          buttonText: 'View Packages',
          targetPage: 'destinations'
        },
        {
          id: '2',
          title: 'Swiss Alps Hiking Adventure',
          subtitle: 'Save 15% on summer alpine trekking guides and luxury chalet lodging.',
          imageUrl: '/assets/unsplash-swiss-alps.jpg',
          buttonText: 'Inquire Now',
          targetPage: 'booking'
        }
      ],
      heroSection: {
        bgImage: '/photo-1506929562872-bb421503ef21.jpeg',
        titleMain: 'Kraft your perfect',
        titleItalic: 'journey.',
        description: 'Handcrafted travel to the world\'s most extraordinary places \nfrom ancient temples in Kyoto to overwater villas in the Maldives. Your escape, designed end-to-end.',
        btnPrimaryText: 'Explore Packages',
        btnSecondaryText: 'Plan a Custom Trip',
        stats: [
          { value: '10+', label: 'Trips Crafted', icon: 'Compass' },
          { value: '52%', label: 'Satisfaction', icon: 'Sparkles' },
          { value: '40+', label: 'Destinations', icon: 'Globe' }
        ]
      },
      ctaSection: {
        bgImage: '/assets/unsplash-app-hero.jpg',
        badgeText: 'Your Next Chapter',
        heading: 'Ready to start planning your escape?',
        description: 'Get in touch with our expert luxury travel specialists. We will customize every detail of your itinerary to build your perfect journey.',
        buttonText: 'Request custom quote'
      }
    };

    const merged = settingsRes.rows.length > 0
      ? { ...defaultSettings, ...settingsRes.rows[0].value }
      : { ...defaultSettings };

    if (!merged.specialOffers) {
      merged.specialOffers = defaultSettings.specialOffers;
    }

    if (!merged.heroSection) {
      merged.heroSection = defaultSettings.heroSection;
    } else {
      merged.heroSection = { ...defaultSettings.heroSection, ...merged.heroSection };
    }

    if (!merged.ctaSection) {
      merged.ctaSection = defaultSettings.ctaSection;
    } else {
      merged.ctaSection = { ...defaultSettings.ctaSection, ...merged.ctaSection };
    }

    if (weatherRes.rows.length > 0) {
      merged.weatherCache = {
        lastUpdated: weatherRes.rows[0].value.updatedAt
      };
    }

    // Redact financial/API config from non-financial roles or guest requests
    if (!user || !roleHas(user.role, 'read:financials')) {
      delete merged.permissions;
      delete merged.apis;
      delete merged.defaultMarkup;
      delete merged.defaultAgentSplit;
      delete merged.inrToUsdRate;
      delete merged.rules;
      delete merged.smtp;
    }

    res.json(merged);
  } catch (error) {
    next(error);
  }
});

// PUT update settings
router.put('/', requirePermission('write:settings'), async (req, res, next) => {
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
