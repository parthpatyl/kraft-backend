import { Router } from 'express';
import { query } from '../db/index.js';
import { requirePermission } from '../middleware/requireRole.js';
import { publicFormLimiter } from '../middleware/rateLimiter.js';
import { validateEmail, validatePhone, validateName, validatePrice, validateInteger, validatePercentage, validateNumber } from '../src/utils/validation.js';

const router = Router();

function validateLeadFields(name, mobile, workEmail, companyName, message) {
  const nameCheck = validateName(name);
  if (!nameCheck.isValid) return nameCheck.error;
  const mobileCheck = validatePhone(mobile);
  if (!mobileCheck.isValid) return mobileCheck.error;
  const emailCheck = validateEmail(workEmail);
  if (!emailCheck.isValid) return emailCheck.error;
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

router.post('/', publicFormLimiter, async (req, res, next) => {
  try {
    const { name, mobile, workEmail, companyName, message } = req.body;

    const validationError = validateLeadFields(name, mobile, workEmail, companyName, message);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (perPersonRate !== undefined && perPersonRate !== null && perPersonRate !== '') {
      const rateCheck = validatePrice(perPersonRate, 'Per person rate');
      if (!rateCheck.isValid) return res.status(400).json({ error: rateCheck.error, field: 'perPersonRate' });
    }
    if (groupSize !== undefined && groupSize !== null && groupSize !== '') {
      const groupCheck = validateInteger(groupSize, { min: 1, fieldName: 'Group size' });
      if (!groupCheck.isValid) return res.status(400).json({ error: groupCheck.error, field: 'groupSize' });
    }
    if (taxRate !== undefined && taxRate !== null && taxRate !== '') {
      const taxCheck = validatePercentage(taxRate, 'Tax rate');
      if (!taxCheck.isValid) return res.status(400).json({ error: taxCheck.error, field: 'taxRate' });
    }
    if (discountValue !== undefined && discountValue !== null && discountValue !== '') {
      const discCheck = validateNumber(discountValue, { min: 0, fieldName: 'Discount value' });
      if (!discCheck.isValid) return res.status(400).json({ error: discCheck.error, field: 'discountValue' });
    }

    const msg = (message || '').slice(0, 1000);
    const groupSizeMatch = msg.match(/Estimated Group Size:\s*(\d+)/);
    const groupSize = groupSizeMatch ? parseInt(groupSizeMatch[1]) : null;

    let perPersonRate = null;
    const pkgMatch = msg.match(/Selected Destination\/Package:\s*(.+)/);
    if (pkgMatch) {
      const pkgName = pkgMatch[1].trim();
      // Match by destination or name substring
      const pkgResult = await query(
        `SELECT starting_price FROM corporate_packages WHERE LOWER(destination) LIKE LOWER($1) OR $1 LIKE '%' || LOWER(destination) || '%' LIMIT 1`,
        [`%${pkgName}%`]
      );
      if (pkgResult.rows.length > 0) {
        perPersonRate = pkgResult.rows[0].starting_price;
      }
    }

    const result = await query(
      `INSERT INTO corporate_leads (name, mobile, work_email, company_name, message, group_size, per_person_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), mobile.trim(), workEmail.trim().toLowerCase(), companyName.trim(), msg, groupSize, perPersonRate]
    );
    res.status(201).json({ message: 'Thank you for your enquiry! We will get back to you shortly.', lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requirePermission('write:bookings'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, mobile, workEmail, companyName, message, perPersonRate, groupSize, discountType, discountValue, taxRate, taxInclusive } = req.body;

    const validationError = validateLeadFields(name, mobile, workEmail, companyName, message);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (perPersonRate !== undefined && perPersonRate !== null && perPersonRate !== '') {
      const rateCheck = validatePrice(perPersonRate, 'Per person rate');
      if (!rateCheck.isValid) return res.status(400).json({ error: rateCheck.error, field: 'perPersonRate' });
    }
    if (groupSize !== undefined && groupSize !== null && groupSize !== '') {
      const groupCheck = validateInteger(groupSize, { min: 1, fieldName: 'Group size' });
      if (!groupCheck.isValid) return res.status(400).json({ error: groupCheck.error, field: 'groupSize' });
    }
    if (taxRate !== undefined && taxRate !== null && taxRate !== '') {
      const taxCheck = validatePercentage(taxRate, 'Tax rate');
      if (!taxCheck.isValid) return res.status(400).json({ error: taxCheck.error, field: 'taxRate' });
    }
    if (discountValue !== undefined && discountValue !== null && discountValue !== '') {
      const discCheck = validateNumber(discountValue, { min: 0, fieldName: 'Discount value' });
      if (!discCheck.isValid) return res.status(400).json({ error: discCheck.error, field: 'discountValue' });
    }

    const result = await query(
      `UPDATE corporate_leads
       SET name = $1, mobile = $2, work_email = $3, company_name = $4, message = $5,
           per_person_rate = $6, group_size = $7, discount_type = $8, discount_value = $9,
           tax_rate = $10, tax_inclusive = $11
       WHERE id = $12 RETURNING *`,
      [
        name.trim(), mobile.trim(), workEmail.trim().toLowerCase(), companyName.trim(), (message || '').slice(0, 1000),
        perPersonRate ?? null, groupSize ?? null, discountType ?? null, discountValue ?? null,
        taxRate ?? 5, taxInclusive ?? true, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('write:bookings'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM corporate_leads WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted', lead: result.rows[0] });
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
