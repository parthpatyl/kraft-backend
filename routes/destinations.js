import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT region, COUNT(*)::int AS tour_count
       FROM packages
       GROUP BY region
       ORDER BY region`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
