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
      agencyAddress: 'Mumbai, Maharashtra, India',
      agencyPhone: '+91 7046704693',
      agencyEmail: 'contact@kraftyourtrip.com',
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
      },
      aboutSection: {
        banner: {
          badge: 'Our Story',
          title: 'Curating bespoke travel',
          description: 'Founded on the belief that travel should be art, KRAFT YOUR TRIP transforms ordinary vacations into masterfully tailored luxury itineraries.',
          bgImage: '/assets/unsplash-about-hero.jpg'
        },
        philosophy: {
          badge: 'Our Philosophy',
          heading: 'Bespoke travel, curated down to the finest detail.',
          p1: 'We understand that the true luxury of travel isn\'t just the 5-star accommodations or private transport — it\'s the luxury of peace of mind, of deep local experiences, and of memories created without friction.',
          p2: 'Whether it is exploring Kyoto\'s historic shrines in traditional dress, trekking the alpine trails facing the Matterhorn, or floating in a private overwater bungalow in the Maldives, our specialists spend months designing, testing, and perfecting each detail to guarantee a perfect trip.',
          image: '/assets/unsplash-about-section.jpg'
        },
        values: [
          { title: 'Bespoke Curation', desc: 'No two journeys are the same. Our luxury travel designers create custom-tailored itineraries to meet your exact desires.', icon: 'Sparkles' },
          { title: 'Expert Local Guides', desc: 'Gain exclusive access and deep cultural connection through our network of elite professional guides and historians.', icon: 'Compass' },
          { title: 'Seamless Coordination', desc: 'From VIP fast-track airport customs to private jet and helicopter charters, we coordinate every detail flawlessly.', icon: 'Sliders' },
          { title: '24/7 Concierge Support', desc: 'Travel with absolute confidence. Our operations team and local field agents are on call around the clock to support you.', icon: 'PhoneCall' }
        ]
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

    if (!merged.aboutSection) {
      merged.aboutSection = defaultSettings.aboutSection;
    } else {
      merged.aboutSection = {
        banner: { ...defaultSettings.aboutSection.banner, ...(merged.aboutSection.banner || {}) },
        philosophy: { ...defaultSettings.aboutSection.philosophy, ...(merged.aboutSection.philosophy || {}) },
        values: merged.aboutSection.values || defaultSettings.aboutSection.values
      };
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
    const existingRes = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
    const currentVal = (existingRes.rows && existingRes.rows[0]) ? existingRes.rows[0].value : {};

    // Deep merge to guarantee untouched sections/fields are preserved
    const newValue = {
      ...currentVal,
      ...req.body,
      heroSection: req.body.heroSection ? { ...(currentVal.heroSection || {}), ...req.body.heroSection } : currentVal.heroSection,
      ctaSection: req.body.ctaSection ? { ...(currentVal.ctaSection || {}), ...req.body.ctaSection } : currentVal.ctaSection,
      aboutSection: req.body.aboutSection ? {
        ...(currentVal.aboutSection || {}),
        ...req.body.aboutSection,
        banner: req.body.aboutSection.banner ? { ...(currentVal.aboutSection?.banner || {}), ...req.body.aboutSection.banner } : currentVal.aboutSection?.banner,
        philosophy: req.body.aboutSection.philosophy ? { ...(currentVal.aboutSection?.philosophy || {}), ...req.body.aboutSection.philosophy } : currentVal.aboutSection?.philosophy,
        values: req.body.aboutSection.values || currentVal.aboutSection?.values
      } : currentVal.aboutSection,
      socialLinks: req.body.socialLinks ? { ...(currentVal.socialLinks || {}), ...req.body.socialLinks } : currentVal.socialLinks,
      rules: req.body.rules ? { ...(currentVal.rules || {}), ...req.body.rules } : currentVal.rules
    };

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

// GET /api/settings/destination-carousel
router.get('/destination-carousel', async (req, res, next) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'destination_carousel'");
    if (result.rows && result.rows.length > 0 && result.rows[0].value) {
      return res.json(result.rows[0].value);
    }
    const navRes = await query("SELECT value FROM settings WHERE key = 'navigation_menu'");
    res.json([]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/destination-carousel
router.put('/destination-carousel', requirePermission('write:settings'), async (req, res, next) => {
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
