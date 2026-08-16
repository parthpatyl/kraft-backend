import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';
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

function mapCorporateToFrontend(row) {
  return {
    ...row,
    startingPrice: row.starting_price != null ? Number(row.starting_price) : null,
    imageUrl: row.image_url || '',
    isActive: row.is_active,
    displayOrder: row.display_order,
    itinerary: typeof row.itinerary === 'string' ? JSON.parse(row.itinerary) : (row.itinerary || []),
    termsAndConditions: row.terms_and_conditions || ''
  };
}

router.get('/', async (req, res, next) => {
  try {
    const user = tryDecodeUser(req);
    const showAll = !!user; // If authenticated, show all (active and inactive)
    const { category } = req.query;

    let sql = 'SELECT * FROM corporate_packages';
    const conditions = [];
    const params = [];

    if (!showAll) {
      conditions.push('is_active = true');
    }

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY display_order ASC, id ASC';
    const result = await query(sql, params);
    res.json(result.rows.map(mapCorporateToFrontend));
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('create:packages'), async (req, res, next) => {
  try {
    const { destination, nights, startingPrice, category, imageUrl, description, highlights, itinerary, termsAndConditions } = req.body;
    if (!destination || !destination.trim()) {
      return res.status(400).json({ error: 'Destination is required' });
    }
    if (!category || !['india', 'international'].includes(category)) {
      return res.status(400).json({ error: 'Category must be india or international' });
    }
    const result = await query(
      `INSERT INTO corporate_packages (destination, nights, starting_price, category, image_url, description, highlights, itinerary, terms_and_conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        destination.trim(),
        nights || '',
        startingPrice ?? null,
        category,
        imageUrl || '',
        description || '',
        highlights || [],
        JSON.stringify(itinerary || []),
        termsAndConditions || null
      ]
    );
    res.status(201).json(mapCorporateToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('write:packages'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { destination, nights, startingPrice, category, imageUrl, description, highlights, itinerary, isActive, displayOrder, termsAndConditions } = req.body;

    if (category !== undefined && !['india', 'international'].includes(category)) {
      return res.status(400).json({ error: 'Category must be india or international' });
    }

    const current = await query('SELECT * FROM corporate_packages WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Corporate package not found' });
    }

    const result = await query(
      `UPDATE corporate_packages SET
        destination = $1, nights = $2, starting_price = $3,
        category = $4, image_url = $5, description = $6,
        highlights = $7, itinerary = $8, is_active = $9, display_order = $10,
        terms_and_conditions = $11
       WHERE id = $12
       RETURNING *`,
      [
        destination !== undefined ? destination : current.rows[0].destination,
        nights !== undefined ? nights : current.rows[0].nights,
        startingPrice !== undefined ? startingPrice : current.rows[0].starting_price,
        category !== undefined ? category : current.rows[0].category,
        imageUrl !== undefined ? imageUrl : current.rows[0].image_url,
        description !== undefined ? description : current.rows[0].description,
        highlights !== undefined ? highlights : current.rows[0].highlights,
        itinerary ? JSON.stringify(itinerary) : current.rows[0].itinerary,
        isActive !== undefined ? isActive : current.rows[0].is_active,
        displayOrder !== undefined ? displayOrder : current.rows[0].display_order,
        termsAndConditions !== undefined ? termsAndConditions : current.rows[0].terms_and_conditions,
        id
      ]
    );
    res.json(mapCorporateToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('delete:packages'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM corporate_packages WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Corporate package not found' });
    }
    res.json({ message: 'Corporate package deleted', pkg: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
