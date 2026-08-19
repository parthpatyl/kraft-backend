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

describe('Milestone 1 Challenger Stress Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
  });

  describe('Boundary Condition 1: Slots Booked Exceeding Total (Overbooking)', () => {
    it('rejects inquiry when departure slots are exceeded (400 Bad Request)', async () => {
      query.mockImplementation((text) => {
        if (text.includes('FROM group_departures WHERE id = $1')) {
          return Promise.resolve({ rows: [{ id: 1, price_modifier: 0, slots_total: 20, slots_booked: 19 }] });
        }
        if (text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({ rows: [{ id: 'pkg-1', name: 'Pkg 1', base_price: 10000, duration: '5 Days', is_bespoke: false }] });
        }
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: {} }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      mockDbClient.query.mockImplementation((text) => {
        if (text.includes('BEGIN')) return Promise.resolve();
        if (text.includes('SELECT * FROM clients')) return Promise.resolve({ rows: [{ id: 'C-1', name: 'Test' }] });
        if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve({ rows: [{ slots_booked: 12 }] });
        // Departure update fails condition slots_booked + 2 <= slots_total (19 + 2 = 21 > 20)
        if (text.includes('UPDATE group_departures SET slots_booked')) return Promise.resolve({ rows: [] });
        if (text.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Alice Wonder',
          email: 'alice@example.com',
          phone: '+15550192831',
          packageId: 'pkg-1',
          departureId: 1,
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          guests: 2
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Not enough slots remaining for this departure date.');
      expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('rejects inquiry when package slots are exceeded even without departure (400 Bad Request)', async () => {
      query.mockImplementation((text) => {
        if (text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({ rows: [{ id: 'pkg-1', name: 'Pkg 1', base_price: 10000, duration: '5 Days', is_bespoke: false }] });
        }
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: {} }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      mockDbClient.query.mockImplementation((text) => {
        if (text.includes('BEGIN')) return Promise.resolve();
        if (text.includes('SELECT * FROM clients')) return Promise.resolve({ rows: [{ id: 'C-1', name: 'Test' }] });
        // Package update fails
        if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve({ rows: [] });
        if (text.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Alice Wonder',
          email: 'alice@example.com',
          phone: '+15550192831',
          packageId: 'pkg-1',
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          guests: 5
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Not enough booking slots remaining/i);
      expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Boundary Condition 2: Negative and Discounted Prices', () => {
    it('handles negative priceModifier (discounted group departure) accurately', async () => {
      query.mockImplementation((text) => {
        if (text.includes('FROM group_departures WHERE id = $1')) {
          return Promise.resolve({ rows: [{ id: 5, price_modifier: -3000 }] });
        }
        if (text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({ rows: [{ id: 'pkg-1', name: 'Pkg 1', base_price: 25000, tax_rate: 5, duration: '4 Days', is_bespoke: false }] });
        }
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { group_discount_enabled: false } }] });
        }
        if (text.includes('INSERT INTO enquiries')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      mockDbClient.query.mockImplementation((text) => {
        if (text.includes('BEGIN')) return Promise.resolve();
        if (text.includes('SELECT * FROM clients')) return Promise.resolve({ rows: [{ id: 'C-1', name: 'Bob' }] });
        if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve({ rows: [{ slots_booked: 2 }] });
        if (text.includes('UPDATE group_departures SET slots_booked')) return Promise.resolve({ rows: [{ id: 5 }] });
        if (text.includes('INSERT INTO bookings')) {
          // base = 25000 - 3000 = 22000. 2 guests = 44000. Tax at 5% = 2200. Net = 46200.
          return Promise.resolve({
            rows: [{
              id: 'BK-DISC',
              client_name: 'Bob',
              amount: 44000,
              tax_amount: 2200,
              net_amount: 46200,
              departure_id: 5,
              guests: 2
            }]
          });
        }
        if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (text.includes('UPDATE clients')) return Promise.resolve();
        if (text.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Bob Ross',
          email: 'bob@example.com',
          phone: '+15550192831',
          packageId: 'pkg-1',
          departureId: 5,
          startDate: '2026-10-01',
          endDate: '2026-10-04',
          guests: 2
        });

      expect(res.status).toBe(201);
      expect(res.body.booking.amount).toBe(44000);
      expect(res.body.booking.taxAmount).toBe(2200);
      expect(res.body.booking.netAmount).toBe(46200);
    });
  });

  describe('Boundary Condition 3: Null, Missing & Special Fields in Departure Mapping', () => {
    it('handles null itinerary, null strings, and undefined slots safely', async () => {
      const minimalDepartureRow = {
        id: 99,
        package_id: 'pkg-empty',
        title: null,
        departure_date: '2026-11-01',
        return_date: null,
        slots_total: null,
        slots_booked: null,
        price_modifier: null,
        cost_price: null,
        cta_badge: null,
        inclusions: null,
        exclusions: null,
        highlights: null,
        itinerary: null,
        status: null,
        notes: null,
        terms_and_conditions: null,
        package_name: 'Empty Pkg',
        package_region: 'Himalayas',
        package_duration: '3 Days',
        package_card_image: null,
        package_base_price: null
      };

      query.mockResolvedValueOnce({ rows: [minimalDepartureRow] });

      const res = await request(app).get('/api/group-departures/99');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 99,
        packageId: 'pkg-empty',
        packageName: 'Empty Pkg',
        packageRegion: 'Himalayas',
        packageDuration: '3 Days',
        packageCardImage: null,
        packageBasePrice: null,
        title: null,
        departureDate: '2026-11-01',
        returnDate: null,
        slots: { booked: 0, total: 20 },
        priceModifier: 0,
        costPrice: 0,
        ctaBadge: '',
        inclusions: [],
        exclusions: [],
        highlights: [],
        itinerary: [],
        status: null,
        notes: null,
        termsAndConditions: ''
      });
    });
  });

  describe('Boundary Condition 4: Foreign Key and Slot Decrement Edge Cases', () => {
    it('DELETE /api/bookings/:id succeeds without departure slot decrement when departure_id is null', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      const bookingWithoutDeparture = {
        id: 'BK-NODEP',
        client_name: 'Solo Traveler',
        client_id: 'C-2',
        package_name: 'Solo Pkg',
        package_id: 'pkg-solo',
        departure_id: null,
        amount: 20000,
        departure_date: '2026-10-10',
        guests: 1
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [bookingWithoutDeparture] });
        }
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: {} }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      mockDbClient.query.mockImplementation((text) => {
        if (text.includes('BEGIN')) return Promise.resolve();
        if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
        if (text.includes('DELETE FROM bookings')) return Promise.resolve();
        if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (text.includes('UPDATE clients')) return Promise.resolve();
        if (text.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .delete('/api/bookings/BK-NODEP')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.booking.departureId).toBeNull();
      // Should update package slots
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE packages SET slots_booked'),
        [1, 'pkg-solo']
      );
      // Should NOT attempt to update group_departures
      expect(mockDbClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE group_departures SET slots_booked'),
        expect.anything()
      );
    });

    it('DELETE /api/group-departures/:id removes departure record cleanly (FK ON DELETE SET NULL maintains booking integrity)', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      const departureToDelete = {
        id: 42,
        package_id: 'pkg-1',
        title: 'Trip to be Deleted',
        departure_date: '2026-12-01',
        slots_total: 20,
        slots_booked: 5
      };

      query.mockResolvedValueOnce({ rows: [departureToDelete] }); // DELETE RETURNING

      const res = await request(app)
        .delete('/api/group-departures/42')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Departure deleted');
      expect(res.body.departure.id).toBe(42);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM group_departures WHERE id = $1'),
        ['42']
      );
    });
  });

  describe('Boundary Condition 5: Date Validation Constraints in Inquiries', () => {
    it('rejects booking inquiry with past start date (400)', async () => {
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Past Traveler',
          email: 'past@example.com',
          phone: '+15550192831',
          packageId: 'pkg-1',
          startDate: '2020-01-01',
          endDate: '2020-01-05',
          guests: 1
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Start date cannot be in the past');
    });

    it('rejects booking inquiry when end date is before start date (400)', async () => {
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Reverse Traveler',
          email: 'reverse@example.com',
          phone: '+15550192831',
          packageId: 'pkg-1',
          startDate: '2026-10-10',
          endDate: '2026-10-05',
          guests: 1
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'End date cannot be before start date');
    });

    it('rejects booking inquiry with invalid date strings (400)', async () => {
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Invalid Date Traveler',
          email: 'invalid@example.com',
          phone: '+15550192831',
          packageId: 'pkg-1',
          startDate: 'not-a-date',
          endDate: '2026-10-05',
          guests: 1
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid start date format');
    });
  });
});
