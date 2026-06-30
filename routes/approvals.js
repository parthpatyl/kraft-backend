import { Router } from 'express';
import { query, getClient } from '../db/index.js';
import crypto from 'crypto';
import { requirePermission } from '../middleware/requireRole.js';
import { roleHas } from '../middleware/permissions.js';
import { notifyAll } from '../middleware/notify.js';

const router = Router();

function generateId() {
  return `APR-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

// Expiry sweep utility
async function sweepExpired() {
  try {
    await query(
      `UPDATE approvals SET status = 'expired' WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW()`
    );
  } catch (err) {
    console.error('[approvals] sweep failed:', err.message);
  }
}

// GET /api/approvals — list approvals
router.get('/', requirePermission('read:bookings'), async (req, res, next) => {
  try {
    await sweepExpired();
    const { status } = req.query;
    const isAdmin = roleHas(req.user.role, 'review:approvals');
    let sql = `SELECT a.*, u.name AS requester_name, u.email AS requester_email
               FROM approvals a
               LEFT JOIN users u ON a.requested_by = u.id`;
    const params = [];
    const conditions = [];

    if (!isAdmin) {
      conditions.push(`a.requested_by = $${params.length + 1}`);
      params.push(req.user.id);
    }

    if (status && status !== 'mine') {
      conditions.push(`a.status = $${params.length + 1}`);
      params.push(status);
    } else if (status === 'mine') {
      // 'mine' returns only the caller's pending
      conditions.push(`a.requested_by = $${params.length + 1}`);
      params.push(req.user.id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY a.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals — submit a new approval request
router.post('/', requirePermission('submit:approvals'), async (req, res, next) => {
  try {
    const { action, entity_type, entity_id, payload, reason, expires_at } = req.body;
    if (!action || !entity_type || !entity_id || !payload) {
      return res.status(400).json({ error: 'action, entity_type, entity_id, and payload are required' });
    }
    const id = generateId();
    const result = await query(
      `INSERT INTO approvals (id, action, entity_type, entity_id, requested_by, payload, reason, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, action, entity_type, entity_id, req.user.id, JSON.stringify(payload), reason || null, expires_at || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/:id/approve — admin approves + replay
router.post('/:id/approve', requirePermission('review:approvals'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, expires_in_days } = req.body;

    const approvalRes = await query('SELECT * FROM approvals WHERE id = $1', [id]);
    if (approvalRes.rows.length === 0) return res.status(404).json({ error: 'Approval not found' });
    const approval = approvalRes.rows[0];
    if (approval.status !== 'pending') return res.status(400).json({ error: `Approval is already ${approval.status}` });

    let success = false;
    let errorMsg = null;
    let executedPayload = null;

    if (approval.action === 'delete:booking') {
      const snap = approval.payload;
      const dbClient = await getClient();
      try {
        await dbClient.query('BEGIN');

        // Verify booking still exists
        const bookingCheck = await dbClient.query('SELECT * FROM bookings WHERE id = $1', [snap.entityId]);
        if (bookingCheck.rows.length === 0) {
          await dbClient.query('ROLLBACK');
          errorMsg = 'Booking no longer exists';
        } else {
          const booking = bookingCheck.rows[0];
          const guestCount = booking.guests || 1;

          if (booking.package_id) {
            await dbClient.query(
              'UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2',
              [guestCount, booking.package_id]
            );
          }

          await dbClient.query('DELETE FROM bookings WHERE id = $1', [snap.entityId]);

          // Log deletion to client logs
          if (booking.client_id) {
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
            const logsRes = await dbClient.query('SELECT logs FROM clients WHERE id = $1', [booking.client_id]);
            const currentLogs = logsRes.rows[0]?.logs || [];
            const updatedLogs = [
              { time: timestamp, text: `Admin: Approved deletion of booking ${snap.entityId} for package "${booking.package_name}" (had ${guestCount} guests)` },
              ...currentLogs
            ];
            await dbClient.query(
              'UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3',
              [JSON.stringify(updatedLogs), timestamp.split(' ')[0], booking.client_id]
            );
          }

          await dbClient.query('COMMIT');
          success = true;
        }
      } catch (err) {
        await dbClient.query('ROLLBACK');
        errorMsg = err.message;
      } finally {
        dbClient.release();
      }
    } else if (approval.action === 'change:booking.pricing') {
      const payload = approval.payload;
      try {
        // Apply only pricing fields from the after state
        const after = payload.after;
        const updates = [];
        const values = [];
        let idx = 1;

        if (after.amount !== undefined) { updates.push(`amount = $${idx++}`); values.push(after.amount); }
        if (after.taxAmount !== undefined) { updates.push(`tax_amount = $${idx++}`); values.push(after.taxAmount); }
        if (after.netAmount !== undefined) { updates.push(`net_amount = $${idx++}`); values.push(after.netAmount); }
        if (after.discountType !== undefined) { updates.push(`discount_type = $${idx++}`); values.push(after.discountType); }
        if (after.discountValue !== undefined) { updates.push(`discount_value = $${idx++}`); values.push(after.discountValue); }

        if (updates.length === 0) {
          errorMsg = 'No pricing fields to update';
        } else {
          values.push(payload.entityId);
          await query(
            `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
          );
          success = true;
        }
      } catch (err) {
        errorMsg = err.message;
      }
    } else if (approval.action === 'change:package.pricing') {
      const payload = approval.payload;
      try {
        const after = payload.after;
        const updates = [];
        const values = [];
        let idx = 1;

        if (after.basePrice !== undefined && after.basePrice !== null) { updates.push(`base_price = $${idx++}`); values.push(after.basePrice); }
        if (after.costPrice !== undefined && after.costPrice !== null) { updates.push(`cost_price = $${idx++}`); values.push(after.costPrice); }
        if (after.taxRate !== undefined && after.taxRate !== null) { updates.push(`tax_rate = $${idx++}`); values.push(after.taxRate); }

        if (updates.length === 0) {
          errorMsg = 'No pricing fields to update';
        } else {
          values.push(payload.entityId);
          await query(
            `UPDATE packages SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
          );
          success = true;
        }
      } catch (err) {
        errorMsg = err.message;
      }
    } else {
      errorMsg = `Unknown action: ${approval.action}`;
    }

    if (success) {
      // Update expiry if admin set one for future requests
      let resolvedExpires = null;
      if (expires_in_days) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(expires_in_days));
        resolvedExpires = d.toISOString();
      }

      await query(
        `UPDATE approvals SET status = 'executed', reviewed_by = $1, reviewed_at = NOW(), reviewer_note = $2, executed_at = NOW(), expires_at = COALESCE($3, expires_at) WHERE id = $4`,
        [req.user.id, note || null, resolvedExpires, id]
      );

      // Notify requester
      const requesterRes = await query('SELECT name, email FROM users WHERE id = $1', [approval.requested_by]);
      const requester = requesterRes.rows[0];
      await notifyAll({
        userId: approval.requested_by,
        userEmail: requester?.email,
        message: `Your ${approval.action} request for ${approval.entity_id} has been approved and executed.`,
        subject: `Approval Approved — ${approval.action}`,
        logText: `System: ${approval.action} request for ${approval.entity_id} approved by admin and executed.`,
        link: `approval:${approval.id}`
      });

      res.json({ message: 'Approval approved and action executed', status: 'executed' });
    } else {
      await query(
        `UPDATE approvals SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), reviewer_note = $2 WHERE id = $3`,
        [req.user.id, errorMsg ? `Execution failed: ${errorMsg}` : (note || null), id]
      );

      const requesterRes = await query('SELECT name, email FROM users WHERE id = $1', [approval.requested_by]);
      const requester = requesterRes.rows[0];
      await notifyAll({
        userId: approval.requested_by,
        userEmail: requester?.email,
        message: `Your ${approval.action} request for ${approval.entity_id} was rejected: ${errorMsg || note || 'No reason given'}`,
        subject: `Approval Rejected — ${approval.action}`,
        logText: `System: ${approval.action} request for ${approval.entity_id} could not be executed: ${errorMsg || note}`,
        link: `approval:${approval.id}`
      });

      res.status(400).json({ error: errorMsg || 'Action execution failed', status: 'rejected' });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/:id/reject
router.post('/:id/reject', requirePermission('review:approvals'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const approvalRes = await query('SELECT * FROM approvals WHERE id = $1', [id]);
    if (approvalRes.rows.length === 0) return res.status(404).json({ error: 'Approval not found' });
    const approval = approvalRes.rows[0];
    if (approval.status !== 'pending') return res.status(400).json({ error: `Approval is already ${approval.status}` });

    await query(
      `UPDATE approvals SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), reviewer_note = $2 WHERE id = $3`,
      [req.user.id, note || null, id]
    );

    const requesterRes = await query('SELECT name, email FROM users WHERE id = $1', [approval.requested_by]);
    const requester = requesterRes.rows[0];
    await notifyAll({
      userId: approval.requested_by,
      userEmail: requester?.email,
      message: `Your ${approval.action} request for ${approval.entity_id} was rejected.${note ? ` Reason: ${note}` : ''}`,
      subject: `Approval Rejected — ${approval.action}`,
      logText: `System: ${approval.action} request for ${approval.entity_id} was rejected by reviewer.`,
      link: `approval:${approval.id}`
    });

    res.json({ message: 'Approval rejected', status: 'rejected' });
  } catch (err) {
    next(err);
  }
});

// POST /api/approvals/:id/cancel — cancel own pending request
router.post('/:id/cancel', requirePermission('submit:approvals'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const approvalRes = await query('SELECT * FROM approvals WHERE id = $1', [id]);
    if (approvalRes.rows.length === 0) return res.status(404).json({ error: 'Approval not found' });
    const approval = approvalRes.rows[0];
    if (approval.status !== 'pending') return res.status(400).json({ error: `Cannot cancel — status is ${approval.status}` });

    // Allow if caller is the requester OR an admin
    const isAdmin = roleHas(req.user.role, 'review:approvals');
    if (approval.requested_by !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'You can only cancel your own approval requests' });
    }

    await query(`UPDATE approvals SET status = 'cancelled' WHERE id = $1`, [id]);
    res.json({ message: 'Approval request cancelled', status: 'cancelled' });
  } catch (err) {
    next(err);
  }
});

export default router;
