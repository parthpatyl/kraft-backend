import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';
import { sendEmail } from '../src/services/emailService.js';
import emailConfig from '../src/config/email.config.js';
import logger from '../src/utils/logger.js';
import { validateEmail } from '../src/utils/validation.js';

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
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) return res.status(400).json({ error: 'Valid email is required', details: emailCheck.error });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be alphanumeric (contain both letters and numbers)' });
    }
    if (!role || !VALID_ROLES.includes(role)) return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'A user with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, avatar_url, last_active_at, created_at`,
      [name.trim(), email, password_hash, role, avatar_url || null]
    );

    const newUser = result.rows[0];

    // Dispatch welcome email asynchronously via SMTP
    try {
      const loginUrl = emailConfig.adminUrl || 'http://localhost:5174';
      await sendEmail({
        to: email,
        subject: 'Welcome to Kraft Your Trip Agency Portal',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e7e5e4; border-radius: 16px; background-color: #ffffff;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #b45309; background-color: #fef3c7; padding: 4px 10px; border-radius: 6px;">Staff Invitation</span>
              <h2 style="color: #1c1917; margin: 12px 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Welcome to the Team, ${name.trim()}!</h2>
              <p style="color: #78716c; font-size: 14px; margin: 0; line-height: 1.5;">You have been granted access to the Kraft Your Trip Agency Portal.</p>
            </div>
            
            <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #78716c; width: 120px;">Email:</td>
                  <td style="padding: 6px 0; color: #1c1917; font-weight: 600;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #78716c;">Temporary Password:</td>
                  <td style="padding: 6px 0; color: #1c1917; font-family: monospace; font-size: 14px; font-weight: 700; color: #b45309;">${password}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #78716c;">Assigned Role:</td>
                  <td style="padding: 6px 0; color: #1c1917; font-weight: 600; text-transform: capitalize;">${role}</td>
                </tr>
              </table>
            </div>

            <p style="color: #57534e; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
              Please sign in and immediately update your password via <strong>Account Settings</strong> in your profile menu.
            </p>

            <a href="${loginUrl}" style="display: inline-block; background-color: #d97706; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 13px; letter-spacing: 0.02em;">Access Agency Portal &rarr;</a>
          </div>
        `,
        text: `Welcome to Kraft Your Trip, ${name.trim()}!\n\nYour account has been created:\nEmail: ${email}\nTemporary Password: ${password}\nRole: ${role}\n\nLogin URL: ${loginUrl}\n\nPlease change your password after logging in.`
      });
      logger.info('Dispatched welcome email to new user', { email, role });
    } catch (emailErr) {
      logger.warn('Could not dispatch welcome email', { error: emailErr.message });
    }

    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id — update name, role, avatar, email
router.put('/:id(\\d+)', requirePermission('manage:users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, avatar_url, email } = req.body;

    const currentRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const current = currentRes.rows[0];

    if (role !== undefined && !VALID_ROLES.includes(role)) return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });

    if (email !== undefined) {
      if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
      const dup = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.trim(), id]);
      if (dup.rows.length > 0) return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Prevent demoting the last admin
    if (current.role === 'admin' && role !== undefined && role !== 'admin') {
      const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin. Create another admin first.' });
      }
    }

    if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });

    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), avatar_url = COALESCE($3, avatar_url), email = COALESCE($4, email) WHERE id = $5 RETURNING id, name, email, role, avatar_url, last_active_at, created_at`,
      [name !== undefined ? name.trim() : null, role || null, avatar_url !== undefined ? avatar_url : null, email !== undefined ? email.trim() : null, id]
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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be alphanumeric (contain both letters and numbers)' });
    }

    const currentRes = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const password_hash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, id]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
