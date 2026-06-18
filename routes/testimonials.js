import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

// GET all testimonials
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM testimonials ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
