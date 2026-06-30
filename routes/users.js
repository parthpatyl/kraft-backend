import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';

const router = Router();

const VALID_ROLES = ['admin', 'operations', 'sales', 'owner'];

// GET /api/users — list all users
router.get('/', requirePermission('manage:users'), async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email, role, avatar_url, last_active_at, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users — create a new user
router.post('/', requirePermission('manage:users'), async (req, res, next) => {
  try {
    const { name, email, password, role, avatar_url } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!role || !VALID_ROLES.includes(role)) return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'A user with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, avatar_url, last_active_at, created_at`,
      [name.trim(), email, password_hash, role, avatar_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — update name, role, avatar
router.put('/:id(\\d+)', requirePermission('manage:users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, avatar_url } = req.body;

    const currentRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const current = currentRes.rows[0];

    if (role !== undefined && !VALID_ROLES.includes(role)) return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });

    // Prevent demoting the last admin
    if (current.role === 'admin' && role !== undefined && role !== 'admin') {
      const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin. Create another admin first.' });
      }
    }

    if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });

    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), avatar_url = COALESCE($3, avatar_url) WHERE id = $4 RETURNING id, name, email, role, avatar_url, last_active_at, created_at`,
      [name !== undefined ? name.trim() : null, role || null, avatar_url !== undefined ? avatar_url : null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id(\\d+)', requirePermission('manage:users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentRes = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Prevent deleting the last admin
    const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    if (currentRes.rows[0].role === 'admin' && parseInt(adminCount.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account.' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/reset-password
router.post('/:id(\\d+)/reset-password', requirePermission('manage:users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentRes = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const newPassword = crypto.randomBytes(4).toString('hex');
    const password_hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, id]);

    res.json({ message: 'Password reset successfully', newPassword });
  } catch (err) {
    next(err);
  }
});

export default router;
