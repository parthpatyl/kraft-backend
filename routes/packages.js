import { Router } from 'express';
import { query } from '../db/index.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

function tryDecodeAdmin(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return false;
  const token = header.slice(7);
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function mapPackageToFrontend(row, { admin = false, inrToUsdRate = 0 } = {}) {
  const price = Number(row.base_price);
  const costPrice = row.cost_price ? Number(row.cost_price) : null;
  const taxRate = row.tax_rate !== null && row.tax_rate !== undefined ? Number(row.tax_rate) : null;

  const base = {
    id: row.id,
    name: row.name,
    duration: row.duration,
    region: row.region,
    slots: { booked: row.slots_booked, total: row.slots_total },
    trend: row.trend,
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
    isBespoke: row.is_bespoke ?? false,
    taxRate,
    taxInclusive: row.tax_inclusive ?? true
  };

  const rate = inrToUsdRate > 0 ? inrToUsdRate : 0;

  if (admin) {
    return {
      ...base,
      basePrice: price,
      costPrice,
      ...(rate ? {
        usdBasePrice: Math.round(price / rate * 100) / 100,
        usdCostPrice: costPrice ? Math.round(costPrice / rate * 100) / 100 : null
      } : {})
    };
  }

  return {
    ...base,
    price,
    ...(rate ? { usdPrice: Math.round(price / rate * 100) / 100 } : {})
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
    const admin = tryDecodeAdmin(req);
    const [pkgResult, settingsResult] = await Promise.all([
      query('SELECT * FROM packages ORDER BY created_at DESC'),
      query("SELECT value FROM settings WHERE key = 'agency_settings'")
    ]);
    const inrToUsdRate = settingsResult.rows[0]?.value?.inrToUsdRate || 0;
    res.json(pkgResult.rows.map((row) => mapPackageToFrontend(row, { admin, inrToUsdRate })));
  } catch (error) {
    next(error);
  }
});

// POST a new package
router.post('/', requireAuth, async (req, res, next) => {
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
    const settingsRes = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
    const inrToUsdRate = settingsRes.rows[0]?.value?.inrToUsdRate || 0;

    const slots_booked = slots?.booked || 0;
    const slots_total = slots?.total || 10;

    const queryText = `
      INSERT INTO packages (id, name, duration, base_price, cost_price, tax_rate, tax_inclusive, region, slots_booked, slots_total, trend, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary, best_month, cta_badge, is_bespoke)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const result = await query(queryText, [
      id,
      name,
      duration,
      basePrice ?? 0,
      costPrice ?? null,
      taxRate ?? null,
      taxInclusive ?? true,
      region ?? null,
      slots_booked,
      slots_total,
      trend ?? null,
      inclusionsSelection ? JSON.stringify(inclusionsSelection) : null,
      heroImage ?? null,
      cardImage ?? null,
      description ?? null,
      highlights ?? [],
      inclusions ?? [],
      exclusions ?? [],
      itinerary ? JSON.stringify(itinerary) : null,
      bestMonth ?? null,
      ctaBadge ?? null,
      isBespoke ?? false
    ]);

    res.status(201).json(mapPackageToFrontend(result.rows[0], { admin: true, inrToUsdRate }));
  } catch (error) {
    next(error);
  }
});

// PUT update a package
router.put('/:id', requireAuth, async (req, res, next) => {
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

    const currentPkgRes = await query('SELECT * FROM packages WHERE id = $1', [id]);
    if (currentPkgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const current = currentPkgRes.rows[0];

    const settingsRes = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
    const inrToUsdRate = settingsRes.rows[0]?.value?.inrToUsdRate || 0;

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
        inclusions_selection = $11,
        hero_image = $12,
        card_image = $13,
        description = $14,
        highlights = $15,
        inclusions = $16,
        exclusions = $17,
        itinerary = $18,
        best_month = $19,
        cta_badge = $20,
        is_bespoke = $21
      WHERE id = $22
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

    res.json(mapPackageToFrontend(result.rows[0], { admin: true, inrToUsdRate }));
  } catch (error) {
    next(error);
  }
});

// DELETE a package
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result, settingsRes] = await Promise.all([
      query('DELETE FROM packages WHERE id = $1 RETURNING *', [id]),
      query("SELECT value FROM settings WHERE key = 'agency_settings'")
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    const inrToUsdRate = settingsRes.rows[0]?.value?.inrToUsdRate || 0;
    res.json({ message: 'Package deleted successfully', package: mapPackageToFrontend(result.rows[0], { admin: true, inrToUsdRate }) });
  } catch (error) {
    next(error);
  }
});

export default router;