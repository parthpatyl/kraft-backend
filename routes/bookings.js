import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

export function mapBookingToFrontend(row) {
  return {
    id: row.id,
    client: row.client_name,
    client_id: row.client_id,
    package: row.package_name,
    package_id: row.package_id,
    amount: row.amount,
    date: formatDateToString(row.date),
    status: row.status,
    agent: row.agent || 'Unassigned',
    guests: row.guests || 1,
    notes: row.notes || '',
    startDate: row.start_date,
    endDate: row.end_date
  };
}

// Utility to format date to "Jun 25, 2026"
function formatDateToString(dateStr) {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

// GET all bookings
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(result.rows.map(mapBookingToFrontend));
  } catch (error) {
    next(error);
  }
});

// POST create booking (from Admin Dashboard)
router.post('/', async (req, res, next) => {
  try {
    const {
      client,
      package: packageName,
      amount,
      date,
      status,
      agent,
      guests,
      notes,
      startDate,
      endDate
    } = req.body;

    const id = req.body.id || `BK-${crypto.randomUUID()}`;

    // Try to find client_id by client name
    const clientRes = await query('SELECT id FROM clients WHERE name = $1', [client]);
    const clientId = clientRes.rows[0]?.id || null;

    // Try to find package_id by package name
    const pkgRes = await query('SELECT id, base_price, slots_booked, slots_total FROM packages WHERE name = $1', [packageName]);
    const packageItem = pkgRes.rows[0];
    const packageId = packageItem?.id || null;

    // Slot validation (warn or block if full)
    if (packageItem && packageItem.slots_booked >= packageItem.slots_total) {
      return res.status(400).json({ error: `Error: No available booking slots remaining for ${packageName}.` });
    }

    const queryText = `
      INSERT INTO bookings (id, client_name, client_id, package_name, package_id, amount, departure_date, status, agent, guests, notes, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await query(queryText, [
      id,
      client,
      clientId,
      packageName,
      packageId,
      amount,
      date || null,
      status || 'Pending',
      agent || 'Unassigned',
      guests || 1,
      notes || '',
      startDate || null,
      endDate || null
    ]);

    // Increment package slots
    if (packageId) {
      await query('UPDATE packages SET slots_booked = slots_booked + 1 WHERE id = $1', [packageId]);
    }

    // Log to client logs
    if (clientId) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const clientLogsRes = await query('SELECT logs FROM clients WHERE id = $1', [clientId]);
      const currentLogs = clientLogsRes.rows[0]?.logs || [];
      const updatedLogs = [
        { time: timestamp, text: `System: Created new booking ${id} for package "${packageName}" (Departure: ${date}, Status: ${status})` },
        ...currentLogs
      ];
      await query('UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3', [JSON.stringify(updatedLogs), timestamp.split(' ')[0], clientId]);
    }

    res.status(201).json(mapBookingToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

// PUT update a booking (status, agent, amount, dates etc)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      client,
      package: packageName,
      amount,
      date,
      status,
      agent,
      guests,
      notes,
      startDate,
      endDate
    } = req.body;

    const currentBookingRes = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (currentBookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const current = currentBookingRes.rows[0];

    // Handle package changes & slots tracking
    let updatedPackageName = packageName !== undefined ? packageName : current.package_name;
    let updatedPackageId = current.package_id;

    if (packageName !== undefined && packageName !== current.package_name) {
      // Find new package
      const newPkgRes = await query('SELECT id, slots_booked, slots_total FROM packages WHERE name = $1', [packageName]);
      const newPkg = newPkgRes.rows[0];
      if (newPkg) {
        if (newPkg.slots_booked >= newPkg.slots_total) {
          return res.status(400).json({ error: `Error: No available booking slots remaining for ${packageName}.` });
        }
        updatedPackageId = newPkg.id;

        // Decrement old package slots
        if (current.package_id) {
          await query('UPDATE packages SET slots_booked = GREATEST(0, slots_booked - 1) WHERE id = $1', [current.package_id]);
        }
        // Increment new package slots
        await query('UPDATE packages SET slots_booked = slots_booked + 1 WHERE id = $1', [newPkg.id]);
      }
    }

    const updatedClientName = client !== undefined ? client : current.client_name;
    let updatedClientId = current.client_id;
    if (client !== undefined && client !== current.client_name) {
      const newClientRes = await query('SELECT id FROM clients WHERE name = $1', [client]);
      updatedClientId = newClientRes.rows[0]?.id || null;
    }

    const queryText = `
      UPDATE bookings SET
        client_name = $1,
        client_id = $2,
        package_name = $3,
        package_id = $4,
        amount = $5,
        departure_date = $6,
        status = $7,
        agent = $8,
        guests = $9,
        notes = $10,
        start_date = $11,
        end_date = $12
      WHERE id = $13
      RETURNING *
    `;

    const result = await query(queryText, [
      updatedClientName,
      updatedClientId,
      updatedPackageName,
      updatedPackageId,
      amount !== undefined ? amount : current.amount,
      date !== undefined ? date : current.date,
      status !== undefined ? status : current.status,
      agent !== undefined ? agent : current.agent,
      guests !== undefined ? guests : current.guests,
      notes !== undefined ? notes : current.notes,
      startDate !== undefined ? startDate : current.start_date,
      endDate !== undefined ? endDate : current.end_date,
      id
    ]);

    // Log update to client logs if client exists
    if (updatedClientId) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const clientLogsRes = await query('SELECT logs FROM clients WHERE id = $1', [updatedClientId]);
      const currentLogs = clientLogsRes.rows[0]?.logs || [];
      const updatedLogs = [
        { time: timestamp, text: `System: Updated booking details for ${id} (Status: ${status || current.status})` },
        ...currentLogs
      ];
      await query('UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3', [JSON.stringify(updatedLogs), timestamp.split(' ')[0], updatedClientId]);
    }

    res.json(mapBookingToFrontend(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

// DELETE a booking
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];

    // Decrement slots_booked for the package
    if (booking.package_id) {
      await query('UPDATE packages SET slots_booked = GREATEST(0, slots_booked - 1) WHERE id = $1', [booking.package_id]);
    }

    await query('DELETE FROM bookings WHERE id = $1', [id]);

    // Log deletion to client logs
    if (booking.client_id) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const clientLogsRes = await query('SELECT logs FROM clients WHERE id = $1', [booking.client_id]);
      const currentLogs = clientLogsRes.rows[0]?.logs || [];
      const updatedLogs = [
        { time: timestamp, text: `System: Deleted booking ${id} for package "${booking.package_name}"` },
        ...currentLogs
      ];
      await query('UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3', [JSON.stringify(updatedLogs), timestamp.split(' ')[0], booking.client_id]);
    }

    res.json({ message: 'Booking deleted successfully', booking: mapBookingToFrontend(booking) });
  } catch (error) {
    next(error);
  }
});

// PUBLIC POST booking/inquiry (from Customer Site)
router.post('/inquiry', async (req, res, next) => {
  try {
    const { name, email, phone, packageId, startDate, endDate, guests, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!phone || !/^[+0-9\s-()]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'A valid phone number is required (at least 7 digits)' });
    }
    if (!packageId) {
      return res.status(400).json({ error: 'Package ID is required' });
    }
    if (packageId === 'custom-other' && (!req.body.customDestination || !req.body.customDestination.trim())) {
      return res.status(400).json({ error: 'Custom destination name is required' });
    }
    
    // Date validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }
    if (start < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }
    
    if (!endDate) {
      return res.status(400).json({ error: 'End date is required' });
    }
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    // 1. Fetch package or handle custom destination
    let packageItem = null;
    let packageNameSelected = '';
    let packageIdSelected = null;
    let formattedAmount = '₹0 (Bespoke Quote)';

    const isCustom = packageId.startsWith('custom-');
    if (isCustom) {
      const destName = packageId.replace('custom-', '').replace(/-/g, ' ');
      const capitalizedDest = destName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      packageNameSelected = `Custom Tour to ${capitalizedDest}`;
      if (packageId === 'custom-other' && req.body.customDestination) {
        packageNameSelected = `Custom Tour to ${req.body.customDestination.trim()}`;
      }
    } else {
      const pkgRes = await query('SELECT * FROM packages WHERE id = $1', [packageId]);
      if (pkgRes.rows.length === 0) {
        return res.status(404).json({ error: 'Travel package not found' });
      }
      packageItem = pkgRes.rows[0];
      packageNameSelected = packageItem.name;
      packageIdSelected = packageItem.id;

      const guestCount = parseInt(guests) || 1;
      formattedAmount = `₹${(Number(packageItem.base_price) * guestCount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

      // Check available slots
      if (packageItem.slots_booked >= packageItem.slots_total) {
        return res.status(400).json({ error: `Error: No available booking slots remaining for ${packageItem.name}.` });
      }
    }

    // 2. Find or create client profile
    let client;
    const clientSearch = await query('SELECT * FROM clients WHERE email = $1', [email]);
    if (clientSearch.rows.length > 0) {
      client = clientSearch.rows[0];
      // Increment bookings count
      await query(
        'UPDATE clients SET historical_bookings_count = historical_bookings_count + 1, last_contact = $1 WHERE id = $2',
        [new Date().toISOString().split('T')[0], client.id]
      );
    } else {
      const newClientId = `C-${crypto.randomUUID()}`;
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const initialLogs = [{ time: timestamp, text: 'System: Client profile initialized from online inquiry' }];

      const newClientRes = await query(
        `INSERT INTO clients (id, name, email, phone, status, tier, historical_ltv, historical_bookings_count, avatar, preferences, passport, visa, emergency_contact, wallet_balance, notes, last_contact, logs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          newClientId,
          name,
          email,
          phone || '',
          'Active',
          'Silver',
          0,
          1,
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
          JSON.stringify({ airline: 'Standard Carrier', seat: 'Window', room: 'Standard King', dietary: 'None' }),
          JSON.stringify({ number: 'Pending', expires: 'Pending', status: 'Valid' }),
          JSON.stringify({ country: 'Pending', expires: 'Pending', class: 'Tourist' }),
          JSON.stringify({ name: 'Not Listed', phone: 'Not Listed', relation: 'Not Listed' }),
          '$0.00',
          'Online inquiry submitted.',
          timestamp.split(' ')[0],
          JSON.stringify(initialLogs)
        ]
      );
      client = newClientRes.rows[0];
    }

    // 3. Create the booking inquiry
    // 3. Create the booking inquiry
    const bookingId = `BK-${crypto.randomUUID()}`;
    const guestCount = parseInt(guests) || 1;

    const bookingQueryText = `
      INSERT INTO bookings (id, client_name, client_id, package_name, package_id, amount, departure_date, status, agent, guests, notes, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const bookingRes = await query(bookingQueryText, [
      bookingId,
      client.name,
      client.id,
      packageNameSelected,
      packageIdSelected,
      formattedAmount,
      startDate || null,
      'Pending',
      'Unassigned',
      guestCount,
      notes || '',
      startDate || null,
      endDate || null
    ]);

    // 4. Increment package booked slots (only if it's a real package)
    if (packageIdSelected) {
      await query('UPDATE packages SET slots_booked = slots_booked + 1 WHERE id = $1', [packageIdSelected]);
    }

    // 5. Append system log to client
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const clientLogsRes = await query('SELECT logs FROM clients WHERE id = $1', [client.id]);
    const currentLogs = clientLogsRes.rows[0]?.logs || [];
    const updatedLogs = [
      { time: timestamp, text: `System: Submitted online inquiry for "${packageNameSelected}" (Booking ID: ${bookingId}, Guests: ${guestCount})` },
      ...currentLogs
    ];
    await query('UPDATE clients SET logs = $1 WHERE id = $2', [JSON.stringify(updatedLogs), client.id]);

    res.status(201).json({
      message: 'Booking inquiry submitted successfully!',
      booking: mapBookingToFrontend(bookingRes.rows[0])
    });
  } catch (error) {
    next(error);
  }
});

export default router;
