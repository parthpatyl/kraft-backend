import crypto from 'crypto';
import logger from '../utils/logger.js';
import { processEnquiryEmails } from '../services/emailQueue.js';
import { query } from '../../db/index.js';
import jwt from 'jsonwebtoken';

function tryDecodeUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function maskEmail(email) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local[0] + '*';
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length < 4) return '***';
  return clean.slice(0, 3) + '*'.repeat(clean.length - 7) + clean.slice(-4);
}

function maskName(name) {
  if (!name) return '';
  return name.split(' ').map(part => {
    if (part.length <= 2) return part[0] + '*';
    return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
  }).join(' ');
}

const VALID_STATUSES = ['logged', 'contacted', 'reviewing', 'proposing', 'finalized', 'converted'];

export async function submitEnquiry(req, res) {
  try {
    const enquiryData = req.validatedBody;
    const id = `ENQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const enquiry = {
      id,
      ...enquiryData,
      submittedAt: new Date().toISOString(),
    };

    await query(
      `INSERT INTO enquiries (id, name, email, phone, destination, travel_date, guests, notes, preferences, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        enquiry.id,
        enquiry.name,
        enquiry.email,
        enquiry.phone,
        enquiry.destination,
        enquiry.travelDate,
        enquiry.guests,
        enquiry.notes,
        enquiry.preferences ? JSON.stringify(enquiry.preferences) : null,
        enquiry.submittedAt
      ]
    );

    await query(
      `INSERT INTO notifications (message, type, link_url, link_type)
       VALUES ($1, $2, $3, $4)`,
      [
        `New travel enquiry received for ${enquiry.destination} from ${enquiry.name} (${id})`,
        'enquiry',
        `enquiry:${id}`,
        'enquiry'
      ]
    ).catch((err) => {
      logger.error('Failed to insert admin notification for enquiry', {
        enquiryId: id,
        error: err.message
      });
    });

    processEnquiryEmails(enquiry).catch((err) => {
      logger.error('Enquiry Email Queue Failed', {
        enquiryId: id,
        error: err.message,
        stack: err.stack,
      });
    });

    logger.info('Enquiry Submitted', {
      enquiryId: id,
      email: enquiry.email,
      destination: enquiry.destination,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Enquiry submitted successfully',
      data: {
        enquiryId: id,
        destination: enquiry.destination,
        travelDate: enquiry.travelDate,
        guests: enquiry.guests,
      },
    });
  } catch (err) {
    logger.error('Enquiry Controller Error', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to submit enquiry. Please try again.',
    });
  }
}

export async function getEnquiryById(req, res) {
  try {
    const { id } = req.params;
    const user = tryDecodeUser(req);
    const isAuthenticated = !!user;

    const { rows } = await query('SELECT * FROM enquiries WHERE id = $1', [id]);
    if (rows.length > 0) {
      const row = rows[0];
      return res.status(200).json({
        status: 'success',
        data: {
          id: row.id,
          name: isAuthenticated ? row.name : maskName(row.name),
          email: isAuthenticated ? row.email : maskEmail(row.email),
          phone: isAuthenticated ? row.phone : maskPhone(row.phone),
          destination: row.destination,
          travelDate: row.travel_date ? new Date(row.travel_date).toISOString().split('T')[0] : null,
          guests: row.guests,
          notes: isAuthenticated ? row.notes : '[Content hidden for security]',
          preferences: isAuthenticated ? row.preferences : null,
          status: row.status || 'logged',
          submittedAt: row.submitted_at,
        },
      });
    }

    if (id.startsWith('BK-')) {
      // Check for status record in enquiries table
      const { rows: statusRows } = await query('SELECT status FROM enquiries WHERE id = $1', [id]);
      const enquiryStatus = statusRows.length > 0 ? statusRows[0].status : 'logged';

      const { rows: bRows } = await query(`
        SELECT b.id, b.client_name, b.package_name, b.guests, b.notes,
               b.start_date, b.departure_date, b.created_at,
               c.email, c.phone
        FROM bookings b
        LEFT JOIN clients c ON c.id = b.client_id
        WHERE b.id = $1
      `, [id]);

      if (bRows.length > 0) {
        const b = bRows[0];
        return res.status(200).json({
          status: 'success',
          data: {
            id: b.id,
            name: isAuthenticated ? b.client_name : maskName(b.client_name),
            email: isAuthenticated ? (b.email || '') : maskEmail(b.email || ''),
            phone: isAuthenticated ? (b.phone || '') : maskPhone(b.phone || ''),
            destination: b.package_name,
            travelDate: b.start_date ? b.start_date.toISOString().split('T')[0] : null,
            guests: b.guests,
            notes: isAuthenticated ? (b.notes || '') : '[Content hidden for security]',
            preferences: null,
            status: enquiryStatus,
            submittedAt: b.created_at || b.start_date,
          },
        });
      }
    }

    return res.status(404).json({
      status: 'error',
      message: 'Enquiry not found',
    });
  } catch (err) {
    logger.error('Error fetching enquiry by ID', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve enquiry details.',
    });
  }
}

export async function listEnquiries(req, res) {
  try {
    const { rows } = await query(
      `SELECT id, name, email, phone, destination, travel_date, guests, notes,
              preferences, status, submitted_at
       FROM enquiries
       ORDER BY submitted_at DESC
       LIMIT 100`
    );

    const enquiries = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      destination: row.destination,
      travelDate: row.travel_date ? new Date(row.travel_date).toISOString().split('T')[0] : null,
      guests: row.guests,
      notes: row.notes,
      preferences: row.preferences,
      status: row.status || 'logged',
      submittedAt: row.submitted_at,
    }));

    return res.status(200).json({ status: 'success', data: enquiries });
  } catch (err) {
    logger.error('Error listing enquiries', { error: err.message, stack: err.stack });
    return res.status(500).json({ status: 'error', message: 'Failed to list enquiries.' });
  }
}

export async function updateEnquiryStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const { rowCount } = await query(
      'UPDATE enquiries SET status = $1 WHERE id = $2',
      [status, id]
    );

    if (rowCount === 0) {
      // BK-* IDs may not have an enquiries row yet — upsert
      if (id.startsWith('BK-')) {
        await query(
          `INSERT INTO enquiries (id, name, email, phone, destination, travel_date, guests, notes, status, submitted_at)
           VALUES ($1, '', '', '', '', null, 0, '', $2, NOW())
           ON CONFLICT (id) DO UPDATE SET status = $2`,
          [id, status]
        );
        logger.info('Enquiry status upserted for BK-* booking', { enquiryId: id, newStatus: status });
        return res.status(200).json({
          status: 'success',
          message: 'Enquiry status updated',
          data: { id, status },
        });
      }
      return res.status(404).json({ status: 'error', message: 'Enquiry not found' });
    }

    logger.info('Enquiry status updated', { enquiryId: id, newStatus: status });

    return res.status(200).json({
      status: 'success',
      message: 'Enquiry status updated',
      data: { id, status },
    });
  } catch (err) {
    logger.error('Error updating enquiry status', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ status: 'error', message: 'Failed to update enquiry status.' });
  }
}

export async function convertToBooking(req, res) {
  try {
    const { id } = req.params;
    const { status: targetStatus = 'Confirmed' } = req.body || {};

    // 1. If this was already a BK-* booking record created via customer inquiry, ensure booking status is Confirmed
    if (id.startsWith('BK-')) {
      const bRes = await query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *', [targetStatus, id]);
      await query('UPDATE enquiries SET status = $1 WHERE id = $2', ['converted', id]);
      if (bRes.rows.length > 0) {
        return res.status(200).json({
          status: 'success',
          message: `Enquiry successfully pushed to active booking (${bRes.rows[0].id})`,
          data: { booking: bRes.rows[0] }
        });
      }
    }

    // 2. Lookup the enquiry
    const enqRes = await query('SELECT * FROM enquiries WHERE id = $1', [id]);
    if (enqRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Enquiry not found' });
    }
    const enq = enqRes.rows[0];

    // 3. Find or create client
    let client = null;
    if (enq.email) {
      const cRes = await query('SELECT * FROM clients WHERE LOWER(email) = LOWER($1)', [enq.email.trim()]);
      if (cRes.rows.length > 0) client = cRes.rows[0];
    }
    if (!client) {
      const newClientId = `CLI-${Date.now().toString(36).toUpperCase()}`;
      const cInsert = await query(`
        INSERT INTO clients (id, name, email, phone, location, status, tier, bookings_count, ltv, wallet_balance, preferences, passport, visa, emergency_contact, logs)
        VALUES ($1, $2, $3, $4, $5, 'Active', 'Silver', 1, 0, 0, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, $6)
        RETURNING *
      `, [
        newClientId,
        enq.name || 'Valued Traveler',
        enq.email || `${newClientId.toLowerCase()}@kraftclient.com`,
        enq.phone || '',
        'Direct Client',
        JSON.stringify([{ time: new Date().toISOString().replace('T', ' ').substring(0, 16), text: `System: Client profile created on conversion of enquiry ${id}` }])
      ]);
      client = cInsert.rows[0];
    }

    // 4. Generate new booking record
    const newBookingId = `BK-${Date.now().toString(36).toUpperCase()}`;
    const guests = parseInt(enq.guests, 10) || 1;
    const bookingRes = await query(`
      INSERT INTO bookings (id, client_name, client_id, package_name, package_id, departure_id, amount, tax_amount, net_amount, discount_type, discount_value, departure_date, status, agent, guests, group_members, notes, start_date, end_date, progress)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      newBookingId, client.name, client.id,
      enq.destination || 'Custom Luxury Tour', null, null,
      0, 0, 0,
      'none', 0,
      enq.travel_date || null, targetStatus, 'Unassigned',
      guests, JSON.stringify([]), enq.notes || '',
      enq.travel_date || null, null,
      JSON.stringify({ quoteSent: true, depositPaid: false, flightsConfirmed: false, finalPayment: false })
    ]);

    // 5. Update enquiry status to 'converted'
    await query('UPDATE enquiries SET status = $1 WHERE id = $2', ['converted', id]);

    return res.status(200).json({
      status: 'success',
      message: `Enquiry successfully converted to booking ${newBookingId}`,
      data: { booking: bookingRes.rows[0] }
    });
  } catch (err) {
    logger.error('Error converting enquiry to booking', { error: err.message, stack: err.stack });
    return res.status(500).json({ status: 'error', message: 'Failed to convert enquiry to booking.' });
  }
}

export async function getEnquiryStatus(req, res) {
  res.json({
    status: 'ok',
    message: 'Enquiry endpoints active',
    version: '1.0.0',
  });
}
