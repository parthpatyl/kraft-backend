import { Router } from 'express';
import { query, getClient } from '../db/index.js';
import crypto from 'crypto';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

export function mapBookingToFrontend(row, { inrToUsdRate = 0 } = {}) {
  const amount = Number(row.amount) || 0;
  const taxAmount = Number(row.tax_amount) || 0;
  const netAmount = Number(row.net_amount) || 0;
  const discountValue = Number(row.discount_value) || 0;
  const rate = inrToUsdRate > 0 ? inrToUsdRate : 0;

  return {
    id: row.id,
    client: row.client_name,
    client_id: row.client_id,
    package: row.package_name,
    package_id: row.package_id,
    amount,
    taxAmount,
    netAmount,
    discountType: row.discount_type || null,
    discountValue,
    date: formatDateToString(row.departure_date),
    status: row.status,
    agent: row.agent || 'Unassigned',
    guests: row.guests || 1,
    groupMembers: row.group_members || [],
    notes: row.notes || '',
    startDate: row.start_date,
    endDate: row.end_date,
    ...(rate ? {
      usdAmount: Math.round(amount / rate * 100) / 100,
      usdTaxAmount: Math.round(taxAmount / rate * 100) / 100,
      usdNetAmount: Math.round(netAmount / rate * 100) / 100,
      usdDiscountValue: Math.round(discountValue / rate * 100) / 100
    } : {})
  };
}

function formatDateToString(dateStr) {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

// GET all bookings
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [result, settingsRes] = await Promise.all([
      query('SELECT * FROM bookings ORDER BY created_at DESC'),
      query("SELECT value FROM settings WHERE key = 'agency_settings'")
    ]);
    const inrToUsdRate = settingsRes.rows[0]?.value?.inrToUsdRate || 0;
    res.json(result.rows.map((row) => mapBookingToFrontend(row, { inrToUsdRate })));
  } catch (error) {
    next(error);
  }
});

// POST create booking (from Admin Dashboard)
router.post('/', requireAuth, async (req, res, next) => {
  const {
    client,
    package: packageName,
    amount,
    date,
    status,
    agent,
    guests,
    groupMembers,
    notes,
    startDate,
    endDate
  } = req.body;

  const id = req.body.id || `BK-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
  const guestCount = parseInt(guests) || 1;

  let clientId = null;
  let packageId = null;
  try {
    const clientRes = await query('SELECT id FROM clients WHERE name = $1', [client]);
    clientId = clientRes.rows[0]?.id || null;

    const pkgRes = await query('SELECT id, name, slots_booked, slots_total FROM packages WHERE name = $1', [packageName]);
    const packageItem = pkgRes.rows[0];
    packageId = packageItem?.id || null;
  } catch (error) {
    return next(error);
  }

  const numericAmount = parseFloat(amount) || 0;
  const taxAmount = Math.round(numericAmount * 0.05 * 100) / 100;
  const netAmount = numericAmount + taxAmount;

  // Normalize groupMembers: ensure index 0 matches primary contact
  const members = Array.isArray(groupMembers) ? groupMembers : [];
  if (members.length === 0) {
    for (let i = 1; i < guestCount; i++) {
      members.push({ name: `Guest ${i + 1}` });
    }
  }

  const dbClient = await getClient();
  let began = false;
  try {
    await dbClient.query('BEGIN');
    began = true;

    // Atomic slot increment — consume guestCount slots
    if (packageId) {
      const slotRes = await dbClient.query(
        'UPDATE packages SET slots_booked = slots_booked + $1 WHERE id = $2 AND slots_booked + $1 <= slots_total RETURNING slots_booked',
        [guestCount, packageId]
      );
      if (slotRes.rows.length === 0) {
        await dbClient.query('ROLLBACK');
        began = false;
        return res.status(400).json({ error: `Not enough booking slots remaining for ${packageName}. Requested ${guestCount}, available slots insufficient.` });
      }
    }

    const insResult = await dbClient.query(`
      INSERT INTO bookings (id, client_name, client_id, package_name, package_id, amount, tax_amount, net_amount, departure_date, status, agent, guests, group_members, notes, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      id, client, clientId, packageName, packageId,
      numericAmount, taxAmount, netAmount,
      date || null, status || 'Pending', agent || 'Unassigned',
      guestCount, JSON.stringify(members), notes || '',
      startDate || null, endDate || null
    ]);

    // Log to client logs
    if (clientId) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const logsRes = await dbClient.query('SELECT logs FROM clients WHERE id = $1', [clientId]);
      const currentLogs = logsRes.rows[0]?.logs || [];
      const updatedLogs = [
        { time: timestamp, text: `System: Created new booking ${id} for package "${packageName}" (Guests: ${guestCount}, Departure: ${date}, Status: ${status})` },
        ...currentLogs
      ];
      await dbClient.query(
        'UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3',
        [JSON.stringify(updatedLogs), timestamp.split(' ')[0], clientId]
      );
    }

    await dbClient.query('COMMIT');
    began = false;

    const postSettingsRes = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
    const postInrToUsdRate = postSettingsRes.rows[0]?.value?.inrToUsdRate || 0;

    res.status(201).json(mapBookingToFrontend(insResult.rows[0], { inrToUsdRate: postInrToUsdRate }));
  } catch (error) {
    if (began) await dbClient.query('ROLLBACK');
    next(error);
  } finally {
    dbClient.release();
  }
});

// PUT update a booking (status, agent, amount, dates, guests, etc)
router.put('/:id', requireAuth, async (req, res, next) => {
  const { id } = req.params;
  const {
    client,
    package: packageName,
    amount,
    discountType,
    discountValue,
    date,
    status,
    agent,
    guests,
    groupMembers,
    notes,
    startDate,
    endDate
  } = req.body;

  let current;
  try {
    const currentBookingRes = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (currentBookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    current = currentBookingRes.rows[0];
  } catch (error) {
    return next(error);
  }

  const dbClient = await getClient();
  let began = false;
  try {
    await dbClient.query('BEGIN');
    began = true;

    let updatedPackageName = packageName !== undefined ? packageName : current.package_name;
    let updatedPackageId = current.package_id;
    const newGuestCount = guests !== undefined ? (parseInt(guests) || 1) : (current.guests || 1);
    const oldGuestCount = current.guests || 1;

    // Handle package changes & slot delta
    if (packageName !== undefined && packageName !== current.package_name) {
      const newPkgRes = await dbClient.query('SELECT id, slots_booked, slots_total FROM packages WHERE name = $1', [packageName]);
      const newPkg = newPkgRes.rows[0];
      if (newPkg) {
        // Release old slots
        if (current.package_id) {
          await dbClient.query(
            'UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2',
            [oldGuestCount, current.package_id]
          );
        }
        // Claim new slots
        const slotRes = await dbClient.query(
          'UPDATE packages SET slots_booked = slots_booked + $1 WHERE id = $2 AND slots_booked + $1 <= slots_total RETURNING slots_booked',
          [newGuestCount, newPkg.id]
        );
        if (slotRes.rows.length === 0) {
          await dbClient.query('ROLLBACK');
          began = false;
          return res.status(400).json({ error: `Not enough slots remaining for ${packageName}. Requested ${newGuestCount}.` });
        }
        updatedPackageId = newPkg.id;
      }
    } else if (newGuestCount !== oldGuestCount) {
      // Same package but guest count changed — adjust slots by delta
      const delta = newGuestCount - oldGuestCount;
      if (current.package_id) {
        if (delta > 0) {
          const slotRes = await dbClient.query(
            'UPDATE packages SET slots_booked = slots_booked + $1 WHERE id = $2 AND slots_booked + $1 <= slots_total RETURNING slots_booked',
            [delta, current.package_id]
          );
          if (slotRes.rows.length === 0) {
            await dbClient.query('ROLLBACK');
            began = false;
            return res.status(400).json({ error: `Not enough slots to add ${delta} more guests.` });
          }
        } else {
          await dbClient.query(
            'UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2',
            [Math.abs(delta), current.package_id]
          );
        }
      }
    }

    const updatedClientName = client !== undefined ? client : current.client_name;
    let updatedClientId = current.client_id;
    if (client !== undefined && client !== current.client_name) {
      const newClientRes = await dbClient.query('SELECT id FROM clients WHERE name = $1', [client]);
      updatedClientId = newClientRes.rows[0]?.id || null;
    }

    const resolvedAmount = amount !== undefined ? (parseFloat(amount) || 0) : Number(current.amount);
    const resolvedTaxAmount = amount !== undefined ? Math.round(resolvedAmount * 0.05 * 100) / 100 : Number(current.tax_amount || 0);
    const resolvedDiscountType = discountType !== undefined ? discountType : current.discount_type;
    const resolvedDiscountValue = discountValue !== undefined ? discountValue : current.discount_value;
    const discount = resolvedDiscountType ? (Number(resolvedDiscountValue) || 0) : 0;
    const resolvedNetAmount = (resolvedAmount - discount) + resolvedTaxAmount;

    const resolvedGroupMembers = groupMembers !== undefined ? groupMembers : (current.group_members || []);

    const updResult = await dbClient.query(`
      UPDATE bookings SET
        client_name = $1, client_id = $2,
        package_name = $3, package_id = $4,
        amount = $5, tax_amount = $6, net_amount = $7,
        discount_type = $8, discount_value = $9,
        departure_date = $10, status = $11,
        agent = $12, guests = $13, group_members = $14,
        notes = $15, start_date = $16, end_date = $17
      WHERE id = $18
      RETURNING *
    `, [
      updatedClientName, updatedClientId,
      updatedPackageName, updatedPackageId,
      resolvedAmount, resolvedTaxAmount, resolvedNetAmount,
      resolvedDiscountType, resolvedDiscountValue,
      (date && date.trim() !== '') ? date : current.departure_date,
      status !== undefined ? status : current.status,
      agent !== undefined ? agent : current.agent,
      newGuestCount, JSON.stringify(resolvedGroupMembers),
      notes !== undefined ? notes : current.notes,
      startDate !== undefined ? (startDate || null) : current.start_date,
      endDate !== undefined ? (endDate || null) : current.end_date,
      id
    ]);

    // Log update to client logs if client exists
    if (updatedClientId) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const logsRes = await dbClient.query('SELECT logs FROM clients WHERE id = $1', [updatedClientId]);
      const currentLogs = logsRes.rows[0]?.logs || [];
      const updatedLogs = [
        { time: timestamp, text: `System: Updated booking details for ${id} (Guests: ${newGuestCount}, Status: ${status || current.status})` },
        ...currentLogs
      ];
      await dbClient.query(
        'UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3',
        [JSON.stringify(updatedLogs), timestamp.split(' ')[0], updatedClientId]
      );
    }

    await dbClient.query('COMMIT');
    began = false;

    const putSettingsRes = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
    const putInrToUsdRate = putSettingsRes.rows[0]?.value?.inrToUsdRate || 0;

    res.json(mapBookingToFrontend(updResult.rows[0], { inrToUsdRate: putInrToUsdRate }));
  } catch (error) {
    if (began) await dbClient.query('ROLLBACK');
    next(error);
  } finally {
    dbClient.release();
  }
});

// DELETE a booking
router.delete('/:id', requireAuth, async (req, res, next) => {
  const { id } = req.params;

  let booking;
  try {
    const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    booking = bookingRes.rows[0];
  } catch (error) {
    return next(error);
  }

  const guestCount = booking.guests || 1;
  const dbClient = await getClient();
  let began = false;
  try {
    await dbClient.query('BEGIN');
    began = true;

    // Decrement slots_booked by guest count
    if (booking.package_id) {
      await dbClient.query(
        'UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2',
        [guestCount, booking.package_id]
      );
    }

    await dbClient.query('DELETE FROM bookings WHERE id = $1', [id]);

    // Log deletion to client logs
    if (booking.client_id) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const logsRes = await dbClient.query('SELECT logs FROM clients WHERE id = $1', [booking.client_id]);
      const currentLogs = logsRes.rows[0]?.logs || [];
      const updatedLogs = [
        { time: timestamp, text: `System: Deleted booking ${id} for package "${booking.package_name}" (had ${guestCount} guests)` },
        ...currentLogs
      ];
      await dbClient.query(
        'UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3',
        [JSON.stringify(updatedLogs), timestamp.split(' ')[0], booking.client_id]
      );
    }

    await dbClient.query('COMMIT');
    began = false;

    const delSettingsRes = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
    const delInrToUsdRate = delSettingsRes.rows[0]?.value?.inrToUsdRate || 0;

    res.json({ message: 'Booking deleted successfully', booking: mapBookingToFrontend(booking, { inrToUsdRate: delInrToUsdRate }) });
  } catch (error) {
    if (began) await dbClient.query('ROLLBACK');
    next(error);
  } finally {
    dbClient.release();
  }
});

// PUBLIC POST booking/inquiry (from Customer Site)
router.post('/inquiry', async (req, res, next) => {
  const { name, email, phone, packageId, startDate, endDate, guests, groupMembers, notes } = req.body;

  // Input validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    return res.status(400).json({ error: 'Name should only contain letters and spaces' });
  }
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!phone || !/^\+[1-9]\d{6,19}$/.test(phone.trim())) {
    return res.status(400).json({ error: 'A valid phone number is required (country code + at least 7 digits)' });
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

  // 1. Fetch package or handle custom destination (reads outside transaction)
  let packageNameSelected = '';
  let packageIdSelected = null;
  let numericAmount = 0;
  let packageDuration = null;
  let packageIsBespoke = false;
  let packageTaxRate = null;

  try {
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
      const packageItem = pkgRes.rows[0];
      packageNameSelected = packageItem.name;
      packageIdSelected = packageItem.id;
      packageDuration = packageItem.duration;
      packageIsBespoke = packageItem.is_bespoke || false;

      const guestCount = parseInt(guests) || 1;
      numericAmount = Number(packageItem.base_price) * guestCount;
      packageTaxRate = packageItem.tax_rate !== null ? Number(packageItem.tax_rate) : null;
    }
  } catch (error) {
    return next(error);
  }

  const guestCount = parseInt(guests) || 1;

  // Safety net: clamp end_date for standard packages to match their duration
  if (packageIdSelected && !packageIsBespoke && packageDuration) {
    const match = String(packageDuration).match(/(\d+)\s*Days?/i);
    if (match) {
      const days = parseInt(match[1]);
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        const computed = new Date(s);
        computed.setDate(computed.getDate() + days - 1);
        const computedStr = computed.toISOString().split('T')[0];
        if (endDate !== computedStr) {
          endDate = computedStr;
        }
      }
    }
  }
  const bookingId = `BK-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;

  // Build groupMembers array: index 0 = primary contact, then incoming entries
  let members = Array.isArray(groupMembers) ? groupMembers : [];
  if (members.length === 0) {
    // Auto-fill from primary for index 0
    members = [{ name: name.trim(), email, phone: phone.trim() }];
    // Pad remaining slots with placeholders
    for (let i = members.length; i < guestCount; i++) {
      members.push({ name: `Guest ${i + 1}` });
    }
  } else {
    // Ensure index 0 matches primary contact
    members[0] = { ...members[0], name: name.trim(), email, phone: phone.trim() };
    // Ensure array length matches guestCount
    while (members.length < guestCount) {
      members.push({ name: `Guest ${members.length + 1}` });
    }
  }

  // Check for group discount
  const inquirySettingsRes = await query("SELECT value FROM settings WHERE key = 'agency_settings'");
  const inquirySettings = inquirySettingsRes.rows[0]?.value || {};

  let discountType = null;
  let discountValue = 0;
  let discountPercent = 0;
  if (inquirySettings.group_discount_enabled && guestCount >= (Number(inquirySettings.group_discount_threshold) || 10)) {
    discountPercent = Number(inquirySettings.group_discount_percent) || 5;
    discountType = 'group';
    discountValue = Math.round(numericAmount * discountPercent / 100 * 100) / 100;
  }

  const inrToUsdRate = inquirySettings.inrToUsdRate || 0;

  const effectiveTaxRate = packageTaxRate || 0;
  const taxAmount = numericAmount > 0 && effectiveTaxRate > 0 ? Math.round(numericAmount * effectiveTaxRate / 100 * 100) / 100 : 0;
  const netAmount = numericAmount - discountValue + taxAmount;

  const dbClient = await getClient();
  let began = false;
  try {
    await dbClient.query('BEGIN');
    began = true;

    // 2. Find or create client profile
    let client;
    const clientSearch = await dbClient.query('SELECT * FROM clients WHERE email = $1', [email]);
    if (clientSearch.rows.length > 0) {
      client = clientSearch.rows[0];
      await dbClient.query(
        'UPDATE clients SET historical_bookings_count = historical_bookings_count + 1, last_contact = $1 WHERE id = $2',
        [new Date().toISOString().split('T')[0], client.id]
      );
    } else {
      const newClientId = `C-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const initialLogs = [{ time: timestamp, text: 'System: Client profile initialized from online inquiry' }];

      const newClientRes = await dbClient.query(
        `INSERT INTO clients (id, name, email, phone, status, tier, historical_ltv, historical_bookings_count, avatar, preferences, passport, visa, emergency_contact, wallet_balance, notes, last_contact, logs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          newClientId, name, email, phone || '',
          'Active', 'Silver', 0, 1,
          '/assets/default-avatar.png',
          JSON.stringify({ airline: 'Standard Carrier', seat: 'Window', room: 'Standard King', dietary: 'None' }),
          JSON.stringify({ number: 'Pending', expires: 'Pending', status: 'Valid' }),
          JSON.stringify({ country: 'Pending', expires: 'Pending', class: 'Tourist' }),
          JSON.stringify({ name: 'Not Listed', phone: 'Not Listed', relation: 'Not Listed' }),
          0, 'Online inquiry submitted.',
          timestamp.split(' ')[0],
          JSON.stringify(initialLogs)
        ]
      );
      client = newClientRes.rows[0];
    }

    // 3. Atomic slot increment — consume guestCount slots (only for real packages)
    if (packageIdSelected) {
      const slotRes = await dbClient.query(
        'UPDATE packages SET slots_booked = slots_booked + $1 WHERE id = $2 AND slots_booked + $1 <= slots_total RETURNING slots_booked',
        [guestCount, packageIdSelected]
      );
      if (slotRes.rows.length === 0) {
        await dbClient.query('ROLLBACK');
        began = false;
        return res.status(400).json({ error: `Not enough booking slots remaining for ${packageNameSelected}. Requested ${guestCount} slots.` });
      }
    }

    // 4. Create the booking inquiry
    const bookingRes = await dbClient.query(`
      INSERT INTO bookings (id, client_name, client_id, package_name, package_id, amount, tax_amount, net_amount, discount_type, discount_value, departure_date, status, agent, guests, group_members, notes, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      bookingId, client.name, client.id,
      packageNameSelected, packageIdSelected,
      numericAmount, taxAmount, netAmount,
      discountType, discountValue,
      startDate || null, 'Pending', 'Unassigned',
      guestCount, JSON.stringify(members), notes || '',
      startDate || null, endDate || null
    ]);

    // 5. Append system log to client
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const logsRes = await dbClient.query('SELECT logs FROM clients WHERE id = $1', [client.id]);
    const currentLogs = logsRes.rows[0]?.logs || [];
    let logText = `System: Submitted online inquiry for "${packageNameSelected}" (Booking ID: ${bookingId}, Guests: ${guestCount})`;
    if (discountType === 'group') {
      logText += ` — Group discount of ${discountPercent}% applied (₹${discountValue.toLocaleString('en-IN')} off)`;
    }
    const updatedLogs = [
      { time: timestamp, text: logText },
      ...currentLogs
    ];
    await dbClient.query('UPDATE clients SET logs = $1 WHERE id = $2', [JSON.stringify(updatedLogs), client.id]);

    await dbClient.query('COMMIT');
    began = false;

    res.status(201).json({
      message: discountType === 'group'
        ? `Booking inquiry submitted successfully! A ${discountPercent}% group discount has been applied.`
        : 'Booking inquiry submitted successfully!',
      booking: mapBookingToFrontend(bookingRes.rows[0], { inrToUsdRate })
    });
  } catch (error) {
    if (began) await dbClient.query('ROLLBACK');
    next(error);
  } finally {
    dbClient.release();
  }
});

export default router;
