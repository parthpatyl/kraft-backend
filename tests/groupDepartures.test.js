import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import { query, getClient } from '../db/index.js';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: { query: vi.fn() },
}));

describe('Group Departures API Routes', () => {
  const sampleDepartureRow = {
    id: 1,
    package_id: 'pkg-kashmir',
    title: 'Spring Blossom Special',
    departure_date: '2026-09-15',
    return_date: '2026-09-21',
    slots_total: 20,
    slots_booked: 4,
    price_modifier: 2500,
    cost_price: 15000,
    cta_badge: 'Guaranteed Departure',
    inclusions: ['Breakfast & Dinner', 'Houseboat Stay', 'Shikara Ride'],
    exclusions: ['Airfare', 'Personal Expenses'],
    highlights: ['Gulmarg Gondola', 'Dal Lake Sunset'],
    itinerary: JSON.stringify([
      { day: 1, title: 'Arrival in Srinagar', desc: 'Check in to houseboat' },
      { day: 2, title: 'Gulmarg Excursion', desc: 'Gondola ride phase 1 & 2' }
    ]),
    status: 'scheduled',
    notes: 'Airport pick up arranged for 11:00 AM flight arrivals',
    terms_and_conditions: '50% deposit on confirmation. Full refund if cancelled 30 days prior.',
    package_name: 'Kashmir Luxury Experience',
    package_region: 'Kashmir',
    package_duration: '7 Days / 6 Nights',
    package_card_image: '/assets/kashmir.jpg',
    package_base_price: 35000
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
  });

  describe('GET /api/group-departures', () => {
    it('returns 200 with mapped fields without requiring authentication', async () => {
      query.mockResolvedValueOnce({ rows: [sampleDepartureRow] });

      const res = await request(app).get('/api/group-departures');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);

      const dep = res.body[0];
      expect(dep).toMatchObject({
        id: 1,
        packageId: 'pkg-kashmir',
        packageName: 'Kashmir Luxury Experience',
        packageRegion: 'Kashmir',
        packageDuration: '7 Days / 6 Nights',
        packageCardImage: '/assets/kashmir.jpg',
        packageBasePrice: 35000,
        title: 'Spring Blossom Special',
        departureDate: '2026-09-15',
        returnDate: '2026-09-21',
        slots: { booked: 4, total: 20 },
        priceModifier: 2500,
        costPrice: 15000,
        ctaBadge: 'Guaranteed Departure',
        inclusions: ['Breakfast & Dinner', 'Houseboat Stay', 'Shikara Ride'],
        exclusions: ['Airfare', 'Personal Expenses'],
        highlights: ['Gulmarg Gondola', 'Dal Lake Sunset'],
        status: 'scheduled',
        notes: 'Airport pick up arranged for 11:00 AM flight arrivals',
        termsAndConditions: '50% deposit on confirmation. Full refund if cancelled 30 days prior.'
      });
      expect(dep.itinerary).toHaveLength(2);
      expect(dep.itinerary[0]).toEqual({ day: 1, title: 'Arrival in Srinagar', desc: 'Check in to houseboat' });
    });

    it('returns empty array when no departures exist', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/group-departures');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/group-departures/:id', () => {
    it('returns 200 with departure details when found', async () => {
      query.mockResolvedValueOnce({ rows: [sampleDepartureRow] });

      const res = await request(app).get('/api/group-departures/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.title).toBe('Spring Blossom Special');
      expect(res.body.priceModifier).toBe(2500);
    });

    it('returns 404 when departure not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/group-departures/999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Departure not found');
    });
  });

  describe('POST /api/group-departures', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .post('/api/group-departures')
        .send({ title: 'New Trip', packageId: 'pkg-1', departureDate: '2026-10-01' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Authentication required');
    });

    it('returns 403 when user lacks create:packages and write:packages permissions', async () => {
      const viewerToken = jwt.sign({ id: 10, role: 'viewer' }, process.env.JWT_SECRET);
      const res = await request(app)
        .post('/api/group-departures')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'New Trip', packageId: 'pkg-1', departureDate: '2026-10-01' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Insufficient permissions');
    });

    it('allows admin role with create:packages permission to create a departure', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // INSERT returning id
      query.mockResolvedValueOnce({ rows: [sampleDepartureRow] }); // SELECT full row

      const res = await request(app)
        .post('/api/group-departures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          packageId: 'pkg-kashmir',
          title: 'Spring Blossom Special',
          departureDate: '2026-09-15',
          returnDate: '2026-09-21',
          slotsTotal: 20,
          priceModifier: 2500,
          costPrice: 15000,
          ctaBadge: 'Guaranteed Departure',
          inclusions: ['Breakfast & Dinner'],
          exclusions: ['Airfare'],
          highlights: ['Gulmarg Gondola'],
          itinerary: [{ day: 1, title: 'Arrival', desc: 'Check in' }],
          status: 'scheduled'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(1);
      expect(res.body.packageId).toBe('pkg-kashmir');
    });

    it('allows operations role with write:packages permission to create a departure', async () => {
      const opsToken = jwt.sign({ id: 2, role: 'operations' }, process.env.JWT_SECRET);
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // INSERT returning id
      query.mockResolvedValueOnce({ rows: [sampleDepartureRow] }); // SELECT full row

      const res = await request(app)
        .post('/api/group-departures')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          packageId: 'pkg-kashmir',
          title: 'Spring Blossom Special',
          departureDate: '2026-09-15',
          slotsTotal: 20
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(1);
    });
  });

  describe('PUT /api/group-departures/:id', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .put('/api/group-departures/1')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(401);
    });

    it('returns 404 when departure does not exist', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      query.mockResolvedValueOnce({ rows: [] }); // current check

      const res = await request(app)
        .put('/api/group-departures/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Departure not found');
    });

    it('updates departure successfully with valid token', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      query.mockResolvedValueOnce({ rows: [sampleDepartureRow] }); // current check
      query.mockResolvedValueOnce({ rows: [] }); // UPDATE query
      query.mockResolvedValueOnce({ rows: [{ ...sampleDepartureRow, title: 'Updated Title' }] }); // SELECT full row

      const res = await request(app)
        .put('/api/group-departures/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title', priceModifier: 3000 });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/group-departures/:id', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).delete('/api/group-departures/1');
      expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks delete:packages permission', async () => {
      const opsToken = jwt.sign({ id: 2, role: 'operations' }, process.env.JWT_SECRET);
      const res = await request(app)
        .delete('/api/group-departures/1')
        .set('Authorization', `Bearer ${opsToken}`);

      expect(res.status).toBe(403);
    });

    it('deletes departure when admin token is provided', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      query.mockResolvedValueOnce({ rows: [sampleDepartureRow] }); // DELETE RETURNING

      const res = await request(app)
        .delete('/api/group-departures/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Departure deleted');
      expect(res.body.departure.id).toBe(1);
    });
  });

  describe('Booking Slot Lifecycle & Price Modifier Integration', () => {
    it('POST /api/bookings/inquiry factors departure priceModifier into calculated amount and claims slots', async () => {
      // Mock departure lookup
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM group_departures WHERE id = $1')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              price_modifier: 2500,
              slots_total: 20,
              slots_booked: 4
            }]
          });
        }
        if (typeof text === 'string' && text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [{
              id: 'pkg-kashmir',
              name: 'Kashmir Luxury Experience',
              base_price: 35000,
              tax_rate: 5,
              duration: '7 Days',
              is_bespoke: false
            }]
          });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({
            rows: [{
              value: {
                group_discount_enabled: false,
                inrToUsdRate: 0
              }
            }]
          });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO enquiries')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) {
          return Promise.resolve();
        }
        if (typeof text === 'string' && text.includes('SELECT * FROM clients WHERE email = $1')) {
          return Promise.resolve({ rows: [{ id: 'C-1', name: 'John Doe', email: 'john@example.com' }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) {
          return Promise.resolve({ rows: [{ slots_booked: 6 }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE group_departures SET slots_booked')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO bookings')) {
          // Expected per guest: base_price (35000) + price_modifier (2500) = 37500. For 2 guests = 75000.
          // Tax at 5% = 3750. Net amount = 78750.
          return Promise.resolve({
            rows: [{
              id: 'BK-100',
              client_name: 'John Doe',
              client_id: 'C-1',
              package_name: 'Kashmir Luxury Experience',
              package_id: 'pkg-kashmir',
              departure_id: 1,
              amount: 75000,
              tax_amount: 3750,
              net_amount: 78750,
              departure_date: '2026-09-15',
              status: 'Pending',
              agent: 'Unassigned',
              guests: 2
            }]
          });
        }
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) {
          return Promise.resolve({ rows: [{ logs: [] }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE clients')) {
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('COMMIT')) {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+15550192831',
          packageId: 'pkg-kashmir',
          departureId: 1,
          startDate: '2026-09-15',
          endDate: '2026-09-21',
          guests: '2'
        });

      expect(res.status).toBe(201);
      expect(res.body.booking).toHaveProperty('departureId', 1);
      expect(res.body.booking).toHaveProperty('amount', 75000);
      expect(res.body.booking).toHaveProperty('taxAmount', 3750);
      expect(res.body.booking).toHaveProperty('netAmount', 78750);

      // Verify slot increment queries were invoked for departure
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE group_departures SET slots_booked = slots_booked + $1'),
        [2, 1]
      );
    });

    it('DELETE /api/bookings/:id decrements group_departures.slots_booked when departure_id is present', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);

      const bookingRow = {
        id: 'BK-100',
        client_name: 'John Doe',
        client_id: 'C-1',
        package_name: 'Kashmir Luxury Experience',
        package_id: 'pkg-kashmir',
        departure_id: 1,
        amount: 75000,
        tax_amount: 3750,
        net_amount: 78750,
        departure_date: '2026-09-15',
        status: 'Pending',
        agent: 'Unassigned',
        guests: 2
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('SELECT * FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [bookingRow] });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { inrToUsdRate: 0 } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('UPDATE group_departures SET slots_booked')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('DELETE FROM bookings')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (typeof text === 'string' && text.includes('UPDATE clients')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .delete('/api/bookings/BK-100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Booking deleted successfully');
      expect(res.body.booking).toHaveProperty('departureId', 1);

      // Verify package slot decrement
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2'),
        [2, 'pkg-kashmir']
      );

      // Verify group departure slot decrement
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE group_departures SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2'),
        [2, 1]
      );
    });
  });
});
