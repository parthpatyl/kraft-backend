import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM corporate_clients WHERE is_active = true ORDER BY display_order ASC, id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('write:clients.profile'), async (req, res, next) => {
  try {
    const { name, logoUrl, industry } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await query(
      `INSERT INTO corporate_clients (name, logo_url, industry)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), logoUrl || '', industry || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('write:clients.profile'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, logoUrl, industry, displayOrder } = req.body;

    const current = await query('SELECT * FROM corporate_clients WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Corporate client not found' });
    }

    const result = await query(
      `UPDATE corporate_clients SET
        name = $1, logo_url = $2, industry = $3, display_order = $4
       WHERE id = $5
       RETURNING *`,
      [
        name !== undefined ? name : current.rows[0].name,
        logoUrl !== undefined ? logoUrl : current.rows[0].logo_url,
        industry !== undefined ? industry : current.rows[0].industry,
        displayOrder !== undefined ? displayOrder : current.rows[0].display_order,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('delete:clients'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE corporate_clients SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Corporate client not found' });
    }
    res.json({ message: 'Corporate client deactivated', client: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
