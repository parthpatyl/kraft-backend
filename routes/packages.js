import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

export function mapPackageToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    duration: row.duration,
    basePrice: Number(row.base_price),
    region: row.region,
    slots: { booked: row.slots_booked, total: row.slots_total },
    trend: row.trend,
    color: row.color,
    inclusionsSelection: row.inclusions_selection,
    heroImage: row.hero_image,
    cardImage: row.card_image,
    description: row.description,
    highlights: row.highlights || [],
    inclusions: row.inclusions || [],
    exclusions: row.exclusions || [],
    itinerary: row.itinerary || [],
    bestMonth: row.best_month || '',
    ctaBadge: row.cta_badge || ''
  };
}

// GET all packages
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM packages ORDER BY created_at DESC');
    res.json(result.rows.map(mapPackageToFrontend));
  } catch (error) {
    next(error);
  }
});

// POST a new package
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      duration,
      basePrice,
      region,
      slots,
      trend,
      color,
      inclusionsSelection,
      heroImage,
      cardImage,
      description,
      highlights,
      inclusions,
      exclusions,
      itinerary,
      bestMonth,
      ctaBadge
    } = req.body;

    const id = req.body.id || `PKG-${crypto.randomUUID()}`;
    const slots_booked = slots?.booked || 0;
    const slots_total = slots?.total || 10;

    const queryText = `
      INSERT INTO packages (id, name, duration, base_price, region, slots_booked, slots_total, trend, color, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary, best_month, cta_badge)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const result = await query(queryText, [
      id,
      name,
      duration,
      basePrice || 0,
      region || 'Asia',
      slots_booked,
      slots_total,
      trend || 'New',
      color || 'bg-stone-100 text-stone-850 border-stone-200',
      JSON.stringify(inclusionsSelection || { hotel: true, sightseeing: true, guide: true, airportTransfer: true, flight: false }),
      heroImage || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
      cardImage || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
      description || '',
      highlights || [],
      inclusions || [],
      exclusions || [],
      JSON.stringify(itinerary || []),
      bestMonth || '',
      ctaBadge || ''
    ]);

    res.status(201).json(mapPackageToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

// PUT update a package
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      duration,
      basePrice,
      region,
      slots,
      trend,
      color,
      inclusionsSelection,
      heroImage,
      cardImage,
      description,
      highlights,
      inclusions,
      exclusions,
      itinerary,
      bestMonth,
      ctaBadge
    } = req.body;

    // Build values dynamically or update everything
    const currentPkgRes = await query('SELECT * FROM packages WHERE id = $1', [id]);
    if (currentPkgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const current = currentPkgRes.rows[0];

    const slots_booked = slots ? slots.booked : current.slots_booked;
    const slots_total = slots ? slots.total : current.slots_total;

    const queryText = `
      UPDATE packages SET
        name = $1,
        duration = $2,
        base_price = $3,
        region = $4,
        slots_booked = $5,
        slots_total = $6,
        trend = $7,
        color = $8,
        inclusions_selection = $9,
        hero_image = $10,
        card_image = $11,
        description = $12,
        highlights = $13,
        inclusions = $14,
        exclusions = $15,
        itinerary = $16,
        best_month = $17,
        cta_badge = $18
      WHERE id = $19
      RETURNING *
    `;

    const result = await query(queryText, [
      name !== undefined ? name : current.name,
      duration !== undefined ? duration : current.duration,
      basePrice !== undefined ? basePrice : current.base_price,
      region !== undefined ? region : current.region,
      slots_booked,
      slots_total,
      trend !== undefined ? trend : current.trend,
      color !== undefined ? color : current.color,
      inclusionsSelection !== undefined ? JSON.stringify(inclusionsSelection) : current.inclusions_selection,
      heroImage !== undefined ? heroImage : current.hero_image,
      cardImage !== undefined ? cardImage : current.card_image,
      description !== undefined ? description : current.description,
      highlights !== undefined ? highlights : current.highlights,
      inclusions !== undefined ? inclusions : current.inclusions,
      exclusions !== undefined ? exclusions : current.exclusions,
      itinerary !== undefined ? JSON.stringify(itinerary) : current.itinerary,
      bestMonth !== undefined ? bestMonth : current.best_month,
      ctaBadge !== undefined ? ctaBadge : current.cta_badge,
      id
    ]);

    res.json(mapPackageToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

// DELETE a package
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM packages WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json({ message: 'Package deleted successfully', package: mapPackageToFrontend(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
