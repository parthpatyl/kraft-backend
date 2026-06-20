import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

export function mapClientToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    tier: row.tier,
    historicalLtv: Number(row.historical_ltv),
    historicalBookingsCount: row.historical_bookings_count,
    avatar: row.avatar,
    preferences: row.preferences || { airline: 'Standard Carrier', seat: 'Window', room: 'Standard King', dietary: 'None' },
    passport: row.passport || { number: 'Pending', expires: 'Pending', status: 'Valid' },
    visa: row.visa || { country: 'Pending', expires: 'Pending', class: 'Tourist' },
    emergencyContact: row.emergency_contact || { name: 'Not Listed', phone: 'Not Listed', relation: 'Not Listed' },
    walletBalance: row.wallet_balance,
    notes: row.notes,
    lastContact: row.last_contact,
    logs: row.logs || []
  };
}

// GET all clients
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(result.rows.map(mapClientToFrontend));
  } catch (error) {
    next(error);
  }
});

// POST a new client
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      status,
      tier,
      historicalLtv,
      historicalBookingsCount,
      avatar,
      preferences,
      passport,
      visa,
      emergencyContact,
      walletBalance,
      notes,
      lastContact,
      logs
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!phone || !/^[+0-9\s-()]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'A valid phone number is required (at least 7 digits)' });
    }
    if (walletBalance) {
      const cleanWallet = parseFloat(walletBalance.replace('₹', '').replace('$', '').replace(/,/g, ''));
      if (isNaN(cleanWallet) || cleanWallet < 0) {
        return res.status(400).json({ error: 'Initial travel credit must be a non-negative number' });
      }
    }
    if (passport) {
      if (passport.number && passport.number.trim() !== 'Pending' && (!passport.expires || passport.expires === 'Pending')) {
        return res.status(400).json({ error: 'Passport expiry date is required if passport number is provided' });
      }
      if (passport.expires && passport.expires !== 'Pending' && (!passport.number || passport.number.trim() === 'Pending')) {
        return res.status(400).json({ error: 'Passport number is required if passport expiry date is provided' });
      }
    }
    if (visa) {
      if (visa.country && visa.country.trim() !== 'Pending' && (!visa.expires || visa.expires === 'Pending')) {
        return res.status(400).json({ error: 'Visa expiry date is required if visa country is provided' });
      }
      if (visa.expires && visa.expires !== 'Pending' && (!visa.country || visa.country.trim() === 'Pending')) {
        return res.status(400).json({ error: 'Visa target country is required if visa expiry date is provided' });
      }
    }
    if (emergencyContact && emergencyContact.phone && emergencyContact.phone.trim() !== 'Not Listed') {
      if (!/^[+0-9\s-()]{7,20}$/.test(emergencyContact.phone.trim())) {
        return res.status(400).json({ error: 'Please enter a valid emergency contact phone number' });
      }
    }

    const id = req.body.id || `C-${crypto.randomUUID()}`;

    const queryText = `
      INSERT INTO clients (id, name, email, phone, status, tier, historical_ltv, historical_bookings_count, avatar, preferences, passport, visa, emergency_contact, wallet_balance, notes, last_contact, logs)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const initialLogs = logs || [{ time: timestamp, text: 'System: Client profile initialized' }];

    const result = await query(queryText, [
      id,
      name,
      email,
      phone || '',
      status || 'Active',
      tier || 'Silver',
      historicalLtv || 0,
      historicalBookingsCount || 0,
      avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      JSON.stringify(preferences || { airline: 'Standard Carrier', seat: 'Window', room: 'Standard King', dietary: 'None' }),
      JSON.stringify(passport || { number: 'Pending', expires: 'Pending', status: 'Valid' }),
      JSON.stringify(visa || { country: 'Pending', expires: 'Pending', class: 'Tourist' }),
      JSON.stringify(emergencyContact || { name: 'Not Listed', phone: 'Not Listed', relation: 'Not Listed' }),
      walletBalance || '$0.00',
      notes || 'No notes added yet.',
      lastContact || new Date().toISOString().split('T')[0],
      JSON.stringify(initialLogs)
    ]);

    res.status(201).json(mapClientToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

// PUT update a client
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      status,
      tier,
      historicalLtv,
      historicalBookingsCount,
      avatar,
      preferences,
      passport,
      visa,
      emergencyContact,
      walletBalance,
      notes,
      lastContact,
      logs
    } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (email !== undefined && !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (phone !== undefined && !/^[+0-9\s-()]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'A valid phone number is required (at least 7 digits)' });
    }
    if (walletBalance !== undefined) {
      const cleanWallet = parseFloat(walletBalance.replace('₹', '').replace('$', '').replace(/,/g, ''));
      if (isNaN(cleanWallet) || cleanWallet < 0) {
        return res.status(400).json({ error: 'Travel wallet credit must be a non-negative number' });
      }
    }
    if (passport !== undefined) {
      if (passport.number && passport.number.trim() !== 'Pending' && (!passport.expires || passport.expires === 'Pending')) {
        return res.status(400).json({ error: 'Passport expiry date is required if passport number is provided' });
      }
      if (passport.expires && passport.expires !== 'Pending' && (!passport.number || passport.number.trim() === 'Pending')) {
        return res.status(400).json({ error: 'Passport number is required if passport expiry date is provided' });
      }
    }
    if (visa !== undefined) {
      if (visa.country && visa.country.trim() !== 'Pending' && (!visa.expires || visa.expires === 'Pending')) {
        return res.status(400).json({ error: 'Visa expiry date is required if visa country is provided' });
      }
      if (visa.expires && visa.expires !== 'Pending' && (!visa.country || visa.country.trim() === 'Pending')) {
        return res.status(400).json({ error: 'Visa target country is required if visa expiry date is provided' });
      }
    }
    if (emergencyContact !== undefined && emergencyContact.phone && emergencyContact.phone.trim() !== 'Not Listed') {
      if (!/^[+0-9\s-()]{7,20}$/.test(emergencyContact.phone.trim())) {
        return res.status(400).json({ error: 'Please enter a valid emergency contact phone number' });
      }
    }

    const currentClientRes = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (currentClientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const current = currentClientRes.rows[0];

    const queryText = `
      UPDATE clients SET
        name = $1,
        email = $2,
        phone = $3,
        status = $4,
        tier = $5,
        historical_ltv = $6,
        historical_bookings_count = $7,
        avatar = $8,
        preferences = $9,
        passport = $10,
        visa = $11,
        emergency_contact = $12,
        wallet_balance = $13,
        notes = $14,
        last_contact = $15,
        logs = $16
      WHERE id = $17
      RETURNING *
    `;

    res.json(mapClientToFrontend((await query(queryText, [
      name !== undefined ? name : current.name,
      email !== undefined ? email : current.email,
      phone !== undefined ? phone : current.phone,
      status !== undefined ? status : current.status,
      tier !== undefined ? tier : current.tier,
      historicalLtv !== undefined ? historicalLtv : current.historical_ltv,
      historicalBookingsCount !== undefined ? historicalBookingsCount : current.historical_bookings_count,
      avatar !== undefined ? avatar : current.avatar,
      preferences !== undefined ? JSON.stringify(preferences) : current.preferences,
      passport !== undefined ? JSON.stringify(passport) : current.passport,
      visa !== undefined ? JSON.stringify(visa) : current.visa,
      emergencyContact !== undefined ? JSON.stringify(emergencyContact) : current.emergency_contact,
      walletBalance !== undefined ? walletBalance : current.wallet_balance,
      notes !== undefined ? notes : current.notes,
      lastContact !== undefined ? lastContact : current.last_contact,
      logs !== undefined ? JSON.stringify(logs) : current.logs,
      id
    ])).rows[0]));
  } catch (error) {
    next(error);
  }
});

// POST append log note to client
router.post('/:id/logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Log text is required' });
    }

    const currentClientRes = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (currentClientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const current = currentClientRes.rows[0];
    const logs = current.logs || [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updatedLogs = [{ time: timestamp, text }, ...logs];

    const result = await query(
      `UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(updatedLogs), timestamp.split(' ')[0], id]
    );

    res.json(mapClientToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

// DELETE a client
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully', client: mapClientToFrontend(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
