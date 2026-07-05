import crypto from 'crypto';
import logger from '../utils/logger.js';
import { processEnquiryEmails } from '../services/emailQueue.js';
import { query } from '../../db/index.js';

const VALID_STATUSES = ['logged', 'reviewing', 'proposing', 'finalized'];

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

    const { rows } = await query('SELECT * FROM enquiries WHERE id = $1', [id]);
    if (rows.length > 0) {
      const row = rows[0];
      return res.status(200).json({
        status: 'success',
        data: {
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
            name: b.client_name,
            email: b.email || '',
            phone: b.phone || '',
            destination: b.package_name,
            travelDate: b.start_date ? b.start_date.toISOString().split('T')[0] : null,
            guests: b.guests,
            notes: b.notes || '',
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

export async function getEnquiryStatus(req, res) {
  res.json({
    status: 'ok',
    message: 'Enquiry endpoints active',
    version: '1.0.0',
  });
}
