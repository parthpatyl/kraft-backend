import { Router } from 'express';
import { query } from '../db/index.js';
import requireAuth from '../middleware/requireAuth.js';
import { requirePermission } from '../middleware/requireRole.js';

const router = Router();

// GET all testimonials
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const allowedTypes = ['consumer', 'corporate'];
    const filterType = allowedTypes.includes(type) ? type : null;
    const sql = filterType
      ? 'SELECT * FROM testimonials WHERE type = $1 ORDER BY id ASC'
      : 'SELECT * FROM testimonials ORDER BY id ASC';
    const params = filterType ? [filterType] : [];
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST create a testimonial
router.post('/', requirePermission('write:testimonials'), async (req, res, next) => {
  try {
    const { name, location, avatar, rating, text, images, package: pkg, type, company } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (text && text.length > 500) {
      return res.status(400).json({ error: 'Review text must be 500 characters or fewer' });
    }
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const result = await query(
      `INSERT INTO testimonials (name, location, avatar, rating, text, images, package, type, company)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name.trim(),
        location || '',
        avatar || '',
        rating || 5,
        text || '',
        JSON.stringify(images || []),
        pkg || '',
        type || 'consumer',
        company || ''
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT update a testimonial
router.put('/:id', requirePermission('write:testimonials'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, avatar, rating, text, images, package: pkg, type, company } = req.body;

    if (text && text.length > 500) {
      return res.status(400).json({ error: 'Review text must be 500 characters or fewer' });
    }
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const current = await query('SELECT * FROM testimonials WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    const result = await query(
      `UPDATE testimonials SET
        name = $1,
        location = $2,
        avatar = $3,
        rating = $4,
        text = $5,
        images = $6,
        package = $7,
        type = $8,
        company = $9
       WHERE id = $10
       RETURNING *`,
      [
        name !== undefined ? name : current.rows[0].name,
        location !== undefined ? location : current.rows[0].location,
        avatar !== undefined ? avatar : current.rows[0].avatar,
        rating !== undefined ? rating : current.rows[0].rating,
        text !== undefined ? text : current.rows[0].text,
        images !== undefined ? JSON.stringify(images) : current.rows[0].images,
        pkg !== undefined ? pkg : current.rows[0].package,
        type !== undefined ? type : current.rows[0].type,
        company !== undefined ? company : current.rows[0].company,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE a testimonial
router.delete('/:id', requirePermission('write:testimonials'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM testimonials WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json({ message: 'Testimonial deleted successfully', testimonial: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
