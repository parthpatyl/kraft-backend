import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

// GET all speciality categories
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
        c.id, 
        c.name, 
        c.subtitle, 
        c.keyword, 
        c.icon_name AS "iconName", 
        c.icon_color AS "iconColor", 
        c.icon_bg AS "iconBg", 
        c.accent_color AS "accentColor", 
        c.default_count AS "defaultCount", 
        c.sort_order AS "sortOrder", 
        c.is_active AS "isActive",
        COALESCE(COUNT(psc.package_id), 0)::int AS "tourCount"
       FROM speciality_categories c
       LEFT JOIN package_speciality_categories psc ON c.id = psc.category_id
       WHERE c.is_active = true
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST create new category
router.post('/', async (req, res, next) => {
  const {
    id,
    name,
    subtitle,
    keyword,
    iconName = 'Compass',
    iconColor = 'text-blue-600',
    iconBg = 'bg-blue-50',
    accentColor = 'text-blue-400',
    defaultCount = 20,
    sortOrder = 0,
    isActive = true
  } = req.body;

  if (!name || !keyword) {
    return res.status(400).json({ error: 'Name and keyword are required' });
  }

  const categoryId = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  try {
    const result = await query(
      `INSERT INTO speciality_categories 
        (id, name, subtitle, keyword, icon_name, icon_color, icon_bg, accent_color, default_count, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING 
        id, 
        name, 
        subtitle, 
        keyword, 
        icon_name AS "iconName", 
        icon_color AS "iconColor", 
        icon_bg AS "iconBg", 
        accent_color AS "accentColor", 
        default_count AS "defaultCount", 
        sort_order AS "sortOrder", 
        is_active AS "isActive"`,
      [categoryId, name, subtitle, keyword, iconName, iconColor, iconBg, accentColor, defaultCount, sortOrder, isActive]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT update category
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    subtitle,
    keyword,
    iconName,
    iconColor,
    iconBg,
    accentColor,
    defaultCount,
    sortOrder,
    isActive
  } = req.body;

  try {
    const result = await query(
      `UPDATE speciality_categories
       SET 
        name = COALESCE($1, name),
        subtitle = COALESCE($2, subtitle),
        keyword = COALESCE($3, keyword),
        icon_name = COALESCE($4, icon_name),
        icon_color = COALESCE($5, icon_color),
        icon_bg = COALESCE($6, icon_bg),
        accent_color = COALESCE($7, accent_color),
        default_count = COALESCE($8, default_count),
        sort_order = COALESCE($9, sort_order),
        is_active = COALESCE($10, is_active)
       WHERE id = $11
       RETURNING 
        id, 
        name, 
        subtitle, 
        keyword, 
        icon_name AS "iconName", 
        icon_color AS "iconColor", 
        icon_bg AS "iconBg", 
        accent_color AS "accentColor", 
        default_count AS "defaultCount", 
        sort_order AS "sortOrder", 
        is_active AS "isActive"`,
      [name, subtitle, keyword, iconName, iconColor, iconBg, accentColor, defaultCount, sortOrder, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE category
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await query(
      `DELETE FROM speciality_categories WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

export default router;
