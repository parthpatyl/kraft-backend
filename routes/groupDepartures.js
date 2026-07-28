import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';

const router = Router();

function mapDepartureToFrontend(row) {
  return {
    id: row.id,
    packageId: row.package_id,
    packageName: row.package_name,
    packageRegion: row.package_region,
    packageDuration: row.package_duration,
    packageCardImage: row.package_card_image,
    packageBasePrice: row.package_base_price ? Number(row.package_base_price) : null,
    title: row.title,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    slots: { booked: row.slots_booked, total: row.slots_total },
    priceModifier: row.price_modifier ? Number(row.price_modifier) : 0,
    costPrice: row.cost_price ? Number(row.cost_price) : 0,
    ctaBadge: row.cta_badge || '',
    inclusions: row.inclusions || [],
    exclusions: row.exclusions || [],
    highlights: row.highlights || [],
    itinerary: typeof row.itinerary === 'string' ? JSON.parse(row.itinerary) : (row.itinerary || []),
    status: row.status,
    notes: row.notes,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT gd.*,
              p.name AS package_name,
              p.region AS package_region,
              p.duration AS package_duration,
              p.card_image AS package_card_image,
              p.base_price AS package_base_price
       FROM group_departures gd
       LEFT JOIN packages p ON p.id = gd.package_id
       ORDER BY gd.departure_date ASC`
    );
    res.json(result.rows.map(mapDepartureToFrontend));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT gd.*,
              p.name AS package_name,
              p.region AS package_region,
              p.duration AS package_duration,
              p.card_image AS package_card_image,
              p.base_price AS package_base_price
       FROM group_departures gd
       LEFT JOIN packages p ON p.id = gd.package_id
       WHERE gd.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Departure not found' });
    }
    res.json(mapDepartureToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('create:packages'), async (req, res, next) => {
  try {
    const { packageId, title, departureDate, returnDate, slotsTotal, priceModifier, costPrice, ctaBadge, inclusions, exclusions, highlights, itinerary, status, notes } = req.body;
    const result = await query(
      `INSERT INTO group_departures (package_id, title, departure_date, return_date, slots_total, price_modifier, cost_price, cta_badge, inclusions, exclusions, highlights, itinerary, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        packageId,
        title,
        departureDate,
        returnDate,
        slotsTotal ?? 20,
        priceModifier ?? 0,
        costPrice ?? 0,
        ctaBadge || null,
        inclusions || [],
        exclusions || [],
        highlights || [],
        JSON.stringify(itinerary || []),
        status || 'scheduled',
        notes
      ]
    );
    res.status(201).json(mapDepartureToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('write:packages'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { packageId, title, departureDate, returnDate, slotsTotal, slotsBooked, priceModifier, costPrice, ctaBadge, inclusions, exclusions, highlights, itinerary, status, notes } = req.body;

    const current = await query('SELECT * FROM group_departures WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Departure not found' });
    }

    const result = await query(
      `UPDATE group_departures SET
        package_id = $1, title = $2, departure_date = $3, return_date = $4,
        slots_total = $5, slots_booked = $6, price_modifier = $7, cost_price = $8,
        cta_badge = $9, inclusions = $10, exclusions = $11, highlights = $12,
        itinerary = $13, status = $14, notes = $15
       WHERE id = $16
       RETURNING *`,
      [
        packageId ?? current.rows[0].package_id,
        title ?? current.rows[0].title,
        departureDate ?? current.rows[0].departure_date,
        returnDate ?? current.rows[0].return_date,
        slotsTotal ?? current.rows[0].slots_total,
        slotsBooked ?? current.rows[0].slots_booked,
        priceModifier ?? current.rows[0].price_modifier,
        costPrice ?? current.rows[0].cost_price,
        ctaBadge ?? current.rows[0].cta_badge,
        inclusions ?? current.rows[0].inclusions,
        exclusions ?? current.rows[0].exclusions,
        highlights ?? current.rows[0].highlights,
        itinerary ? JSON.stringify(itinerary) : current.rows[0].itinerary,
        status ?? current.rows[0].status,
        notes ?? current.rows[0].notes,
        id
      ]
    );
    res.json(mapDepartureToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('delete:packages'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM group_departures WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Departure not found' });
    }
    res.json({ message: 'Departure deleted', departure: mapDepartureToFrontend(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
