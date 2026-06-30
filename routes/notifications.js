import { Router } from 'express';
import { query } from '../db/index.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id IS NULL OR user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { message, type, link } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const linkType = link ? (link.includes(':') ? link.split(':')[0] : null) : null;
    const result = await query(
      'INSERT INTO notifications (message, type, link_url, link_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [message, type || 'system', link || null, linkType]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read = TRUE WHERE read = FALSE AND (user_id IS NULL OR user_id = $1)', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
});

router.delete('/clear-all', async (req, res, next) => {
  try {
    await query('DELETE FROM notifications WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });

    const result = await query(
      'UPDATE notifications SET read = NOT read WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });

    const result = await query(
      'DELETE FROM notifications WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
