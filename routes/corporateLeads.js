import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLeadFields(name, mobile, workEmail, companyName, message) {
  if (!name || !name.trim()) return 'Name is required';
  if (!mobile || !mobile.trim()) return 'Mobile number is required';
  if (!/^\+?\d{7,15}$/.test(mobile.trim())) return 'Invalid mobile number format (digits only, 7-15 chars)';
  if (!workEmail || !workEmail.trim()) return 'Work email is required';
  if (!EMAIL_RE.test(workEmail.trim())) return 'Invalid email format';
  if (!companyName || !companyName.trim()) return 'Company name is required';
  if (message && message.length > 1000) return 'Message must be 1000 characters or fewer';
  return null;
}

router.get('/', requirePermission('read:bookings'), async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM corporate_leads ORDER BY submitted_at DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, mobile, workEmail, companyName, message } = req.body;

    const validationError = validateLeadFields(name, mobile, workEmail, companyName, message);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await query(
      `INSERT INTO corporate_leads (name, mobile, work_email, company_name, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), mobile.trim(), workEmail.trim().toLowerCase(), companyName.trim(), (message || '').slice(0, 1000)]
    );
    res.status(201).json({ message: 'Thank you for your enquiry! We will get back to you shortly.', lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', requirePermission('write:bookings'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await query(
      'UPDATE corporate_leads SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
