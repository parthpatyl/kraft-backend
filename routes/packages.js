import { Router } from 'express';
import { query } from '../db/index.js';
import crypto from 'crypto';

const router = Router();

export function mapPackageToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    duration: row.duration,
    basePrice: Number(row.base_price),
    costPrice: row.cost_price ? Number(row.cost_price) : null,
    taxRate: row.tax_rate ? Number(row.tax_rate) : 5,
    taxInclusive: row.tax_inclusive ?? true,
    region: row.region,
    slots: { booked: row.slots_booked, total: row.slots_total },
    trend: row.trend,
    color: row.color,
    inclusionsSelection: row.inclusions_selection,
    heroImage: row.hero_image,
    cardImage: row.card_image,
    description: row.description,
    highlights: row.highlights ?? [],
    inclusions: row.inclusions ?? [],
    exclusions: row.exclusions ?? [],
    itinerary: row.itinerary ?? [],
    bestMonth: row.best_month ?? '',
    ctaBadge: row.cta_badge ?? '',
    isBespoke: row.is_bespoke ?? false
  };
}

function validatePrice(val, name) {
  if (val === undefined || val === null) return null;
  if (typeof val !== 'number' || isNaN(val) || val < 0) {
    return new Error(`"${name}" must be a non-negative number`);
  }
  return null;
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
      costPrice,
      taxRate,
      taxInclusive,
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
      ctaBadge,
      isBespoke
    } = req.body;

    const err = validatePrice(basePrice, 'basePrice')
      || validatePrice(costPrice, 'costPrice')
      || validatePrice(taxRate, 'taxRate');
    if (err) return res.status(400).json({ error: err.message });

    const id = req.body.id || `PKG-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
    const slots_booked = slots?.booked || 0;
    const slots_total = slots?.total || 10;

    const queryText = `
      INSERT INTO packages (id, name, duration, base_price, cost_price, tax_rate, tax_inclusive, region, slots_booked, slots_total, trend, color, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary, best_month, cta_badge, is_bespoke)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `;

    const result = await query(queryText, [
      id,
      name,
      duration,
      basePrice || 0,
      costPrice ?? null,
      taxRate ?? 5,
      taxInclusive ?? true,
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
      ctaBadge || '',
      isBespoke || false
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
      costPrice,
      taxRate,
      taxInclusive,
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
      ctaBadge,
      isBespoke
    } = req.body;

    const err = validatePrice(basePrice, 'basePrice')
      || validatePrice(costPrice, 'costPrice')
      || validatePrice(taxRate, 'taxRate');
    if (err) return res.status(400).json({ error: err.message });

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
        cost_price = $4,
        tax_rate = $5,
        tax_inclusive = $6,
        region = $7,
        slots_booked = $8,
        slots_total = $9,
        trend = $10,
        color = $11,
        inclusions_selection = $12,
        hero_image = $13,
        card_image = $14,
        description = $15,
        highlights = $16,
        inclusions = $17,
        exclusions = $18,
        itinerary = $19,
        best_month = $20,
        cta_badge = $21,
        is_bespoke = $22
      WHERE id = $23
      RETURNING *
    `;

    const result = await query(queryText, [
      name !== undefined ? name : current.name,
      duration !== undefined ? duration : current.duration,
      basePrice !== undefined ? basePrice : current.base_price,
      costPrice !== undefined ? costPrice : current.cost_price,
      taxRate !== undefined ? taxRate : current.tax_rate,
      taxInclusive !== undefined ? taxInclusive : current.tax_inclusive,
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
      isBespoke !== undefined ? isBespoke : current.is_bespoke,
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
