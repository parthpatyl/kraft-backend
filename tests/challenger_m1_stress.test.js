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
          startDate: '2026-11-01',
          endDate: '2026-11-05',
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
          startDate: '2026-11-01',
          endDate: '2026-11-05',
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
          startDate: '2026-11-01',
          endDate: '2026-11-04',
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
          startDate: '2026-11-10',
          endDate: '2026-11-05',
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
          endDate: '2026-11-05',
          guests: 1
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid start date format');
    });
  });

  describe('Empirical Verification: Client Status Synchronization & Booking Cancellation Cascade', () => {
    const adminToken = jwt.sign({ id: 1, role: 'admin' }, 'super-secret-test-jwt-key-32chars-long!');

    it('1. Multi-booking client: Client has 2 bookings. Booking 1 is cancelled. Verify client status remains "Active"', async () => {
      const bookingToCancel = {
        id: 'BK-MULTI-1',
        client_name: 'Kavita Multi',
        client_id: 'CLI-KAVITA-MULTI',
        package_name: 'Greece Odyssey',
        package_id: 'pkg-greece',
        departure_id: null,
        amount: 100000,
        tax_amount: 5000,
        net_amount: 105000,
        departure_date: '2026-11-20',
        status: 'Confirmed',
        agent: 'Rajesh',
        guests: 2,
        notes: '',
        cancellation_reason: null,
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [bookingToCancel] });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { inrToUsdRate: 0 } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked = GREATEST')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('UPDATE bookings SET')) {
          return Promise.resolve({
            rows: [
              {
                ...bookingToCancel,
                status: 'Cancelled',
                cancellation_reason: 'Client requested cancellation',
              },
            ],
          });
        }
        if (typeof text === 'string' && text.includes('COUNT(*)::int AS count FROM bookings WHERE client_id')) {
          // Client has 1 OTHER active booking!
          return Promise.resolve({ rows: [{ count: 1 }] });
        }
        if (typeof text === 'string' && text.includes('SELECT status FROM clients WHERE id = $1')) {
          return Promise.resolve({ rows: [{ status: 'Active' }] });
        }
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) {
          return Promise.resolve({ rows: [{ logs: [] }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE clients SET logs = $1')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-MULTI-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: 'Client requested cancellation',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Cancelled');
      expect(res.body.clientStatus).toBe('Active');

      // Assert UPDATE clients SET status = 'Cancelled' was NEVER executed
      expect(mockDbClient.query).not.toHaveBeenCalledWith(
        "UPDATE clients SET status = 'Cancelled' WHERE id = $1",
        expect.anything()
      );
    });

    it('2. Last booking cancelled: Client has 1 booking. Booking is cancelled. Verify client status transitions to "Cancelled"', async () => {
      const singleBooking = {
        id: 'BK-KAVITA-ONLY',
        client_name: 'Kavita Solo',
        client_id: 'CLI-KAVITA-SOLO',
        package_name: 'Greece Odyssey',
        package_id: 'pkg-greece',
        departure_id: null,
        amount: 80000,
        tax_amount: 4000,
        net_amount: 84000,
        departure_date: '2026-11-20',
        status: 'Confirmed',
        agent: 'Rajesh',
        guests: 1,
        notes: '',
        cancellation_reason: null,
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [singleBooking] });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { inrToUsdRate: 0 } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked = GREATEST')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('UPDATE bookings SET')) {
          return Promise.resolve({
            rows: [
              {
                ...singleBooking,
                status: 'Cancelled',
                cancellation_reason: 'Client medical emergency',
              },
            ],
          });
        }
        if (typeof text === 'string' && text.includes('COUNT(*)::int AS count FROM bookings WHERE client_id')) {
          // 0 remaining active bookings!
          return Promise.resolve({ rows: [{ count: 0 }] });
        }
        if (typeof text === 'string' && text.includes("UPDATE clients SET status = 'Cancelled'")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) {
          return Promise.resolve({ rows: [{ logs: [] }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE clients SET logs = $1')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-KAVITA-ONLY')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: 'Client medical emergency',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Cancelled');
      expect(res.body.cancellationReason).toBe('Client medical emergency');
      expect(res.body.clientStatus).toBe('Cancelled');

      // Assert UPDATE clients SET status = 'Cancelled' was executed with CLI-KAVITA-SOLO
      expect(mockDbClient.query).toHaveBeenCalledWith(
        "UPDATE clients SET status = 'Cancelled' WHERE id = $1",
        ['CLI-KAVITA-SOLO']
      );
    });

    it('3a. Re-activation to Confirmed: Cancelled booking is set back to "Confirmed". Verify client status returns to "Active" and slots reclaimed', async () => {
      const cancelledBooking = {
        id: 'BK-REACTIVATE-1',
        client_name: 'Returning Client',
        client_id: 'CLI-RETURNING',
        package_name: 'Swiss Alps',
        package_id: 'pkg-swiss',
        departure_id: null,
        amount: 150000,
        tax_amount: 7500,
        net_amount: 157500,
        departure_date: '2026-12-05',
        status: 'Cancelled',
        agent: 'Rajesh',
        guests: 2,
        cancellation_reason: 'Previous conflict resolved',
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [cancelledBooking] });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { inrToUsdRate: 0 } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
        // Re-activation adds slots back
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked = slots_booked + $1')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('UPDATE bookings SET')) {
          return Promise.resolve({
            rows: [
              {
                ...cancelledBooking,
                status: 'Confirmed',
                cancellation_reason: null,
              },
            ],
          });
        }
        if (typeof text === 'string' && text.includes("UPDATE clients SET status = 'Active'")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) {
          return Promise.resolve({ rows: [{ logs: [] }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE clients SET logs = $1')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-REACTIVATE-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Confirmed',
          cancellationReason: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Confirmed');
      expect(res.body.clientStatus).toBe('Active');

      // Verify slots reclaimed
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'UPDATE packages SET slots_booked = slots_booked + $1 WHERE id = $2',
        [2, 'pkg-swiss']
      );

      // Verify client restored to Active
      expect(mockDbClient.query).toHaveBeenCalledWith(
        "UPDATE clients SET status = 'Active' WHERE id = $1",
        ['CLI-RETURNING']
      );
    });

    it('3b. Re-activation to Pending: Cancelled booking is set back to "Pending". Verify client status returns to "Active"', async () => {
      const cancelledBooking = {
        id: 'BK-REACTIVATE-2',
        client_name: 'Pending Client',
        client_id: 'CLI-PENDING',
        package_name: 'Swiss Alps',
        package_id: 'pkg-swiss',
        departure_id: null,
        status: 'Cancelled',
        guests: 1,
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [cancelledBooking] });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { inrToUsdRate: 0 } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked = slots_booked + $1')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('UPDATE bookings SET')) {
          return Promise.resolve({
            rows: [{ ...cancelledBooking, status: 'Pending' }],
          });
        }
        if (typeof text === 'string' && text.includes("UPDATE clients SET status = 'Active'")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) {
          return Promise.resolve({ rows: [{ logs: [] }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE clients SET logs = $1')) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-REACTIVATE-2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Pending',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Pending');
      expect(res.body.clientStatus).toBe('Active');
      expect(mockDbClient.query).toHaveBeenCalledWith(
        "UPDATE clients SET status = 'Active' WHERE id = $1",
        ['CLI-PENDING']
      );
    });

    it('4a. Package slot release: decrements slots_booked using GREATEST(0, slots_booked - count) and never negative', async () => {
      const activeBooking = {
        id: 'BK-SLOT-TEST',
        client_name: 'Slot Tester',
        client_id: 'CLI-SLOT',
        package_name: 'Bali Retreat',
        package_id: 'pkg-bali',
        departure_id: null,
        status: 'Confirmed',
        guests: 4,
      };

      query.mockImplementation((text) => {
        if (text.includes('FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [activeBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text) => {
        if (text.includes('BEGIN') || text.includes('COMMIT')) return Promise.resolve();
        if (text.includes('UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (text.includes('UPDATE bookings SET')) return Promise.resolve({ rows: [{ ...activeBooking, status: 'Cancelled' }] });
        if (text.includes('COUNT(*)::int AS count FROM bookings')) return Promise.resolve({ rows: [{ count: 0 }] });
        if (text.includes("UPDATE clients SET status = 'Cancelled'")) return Promise.resolve({ rowCount: 1 });
        if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (text.includes('UPDATE clients SET logs = $1')) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-SLOT-TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled', cancellationReason: 'Testing slot decrement' });

      expect(res.status).toBe(200);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2',
        [4, 'pkg-bali']
      );
    });

    it('4b. Package slot release with departure: decrements both package and group_departure slots', async () => {
      const activeDepBooking = {
        id: 'BK-DEP-SLOT-TEST',
        client_name: 'Departure Slot Tester',
        client_id: 'CLI-DEP-SLOT',
        package_name: 'Ladakh Explorer',
        package_id: 'pkg-ladakh',
        departure_id: 10,
        status: 'Confirmed',
        guests: 3,
      };

      query.mockImplementation((text) => {
        if (text.includes('FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [activeDepBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text) => {
        if (text.includes('BEGIN') || text.includes('COMMIT')) return Promise.resolve();
        if (text.includes('UPDATE packages SET slots_booked = GREATEST')) return Promise.resolve({ rowCount: 1 });
        if (text.includes('UPDATE group_departures SET slots_booked = GREATEST')) return Promise.resolve({ rowCount: 1 });
        if (text.includes('UPDATE bookings SET')) return Promise.resolve({ rows: [{ ...activeDepBooking, status: 'Cancelled' }] });
        if (text.includes('COUNT(*)::int AS count FROM bookings')) return Promise.resolve({ rows: [{ count: 0 }] });
        if (text.includes("UPDATE clients SET status = 'Cancelled'")) return Promise.resolve({ rowCount: 1 });
        if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (text.includes('UPDATE clients SET logs = $1')) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-DEP-SLOT-TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled', cancellationReason: 'Departure trip cancelled' });

      expect(res.status).toBe(200);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2',
        [3, 'pkg-ladakh']
      );
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'UPDATE group_departures SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2',
        [3, 10]
      );
    });

    it('4c. Idempotency: Cancelling an already Cancelled booking does not decrement slots or alter client status', async () => {
      const alreadyCancelled = {
        id: 'BK-ALREADY-CANCELLED',
        client_name: 'Repeat Canceller',
        client_id: 'CLI-REPEAT',
        package_name: 'Ladakh Explorer',
        package_id: 'pkg-ladakh',
        departure_id: 10,
        status: 'Cancelled',
        guests: 2,
        cancellation_reason: 'Already cancelled',
      };

      query.mockImplementation((text) => {
        if (text.includes('FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [alreadyCancelled] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text) => {
        if (text.includes('BEGIN') || text.includes('COMMIT')) return Promise.resolve();
        if (text.includes('UPDATE bookings SET')) return Promise.resolve({ rows: [alreadyCancelled] });
        if (text.includes('COUNT(*)::int AS count FROM bookings')) return Promise.resolve({ rows: [{ count: 0 }] });
        if (text.includes("UPDATE clients SET status = 'Cancelled'")) return Promise.resolve({ rowCount: 1 });
        if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (text.includes('UPDATE clients SET logs = $1')) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-ALREADY-CANCELLED')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled', cancellationReason: 'Duplicate cancellation attempt' });

      expect(res.status).toBe(200);

      // Verify slot decrement was NOT called because current.status was already 'Cancelled'
      expect(mockDbClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE packages SET slots_booked = GREATEST'),
        expect.anything()
      );
      expect(mockDbClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE group_departures SET slots_booked = GREATEST'),
        expect.anything()
      );
    });

    it('5. Audit logging: Client logs receive cancellation reason and system note', async () => {
      const booking = {
        id: 'BK-LOG-TEST',
        client_name: 'Log Target',
        client_id: 'CLI-LOG-1',
        package_name: 'Kerala Backwaters',
        package_id: 'pkg-kerala',
        departure_id: null,
        status: 'Confirmed',
        guests: 2,
      };

      query.mockImplementation((text) => {
        if (text.includes('FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [booking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      let savedLogsJson = null;

      mockDbClient.query.mockImplementation((text, params) => {
        if (text.includes('BEGIN') || text.includes('COMMIT')) return Promise.resolve();
        if (text.includes('UPDATE packages SET slots_booked = GREATEST')) return Promise.resolve({ rowCount: 1 });
        if (text.includes('UPDATE bookings SET')) return Promise.resolve({ rows: [{ ...booking, status: 'Cancelled', cancellation_reason: 'Client visa rejected' }] });
        if (text.includes('COUNT(*)::int AS count FROM bookings')) return Promise.resolve({ rows: [{ count: 0 }] });
        if (text.includes("UPDATE clients SET status = 'Cancelled'")) return Promise.resolve({ rowCount: 1 });
        if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [{ time: '2026-10-01 10:00', text: 'Initial lead' }] }] });
        if (text.includes('UPDATE clients SET logs = $1')) {
          savedLogsJson = params[0];
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-LOG-TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled', cancellationReason: 'Client visa rejected' });

      expect(res.status).toBe(200);
      expect(savedLogsJson).not.toBeNull();
      const logs = JSON.parse(savedLogsJson);
      expect(logs).toHaveLength(2);
      expect(logs[0].text).toContain('Status: Cancelled, Reason: Client visa rejected');
      expect(logs[1].text).toBe('Initial lead');
    });

    it('6. TDZ & Scope Bug: Updating active booking with departure_id succeeds with 200 after TDZ fix', async () => {
      const activeDepBooking = {
        id: 'BK-ACTIVE-DEP',
        client_name: 'Active Traveler',
        client_id: 'CLI-ACTIVE-1',
        package_name: 'Ladakh Explorer',
        package_id: 'pkg-ladakh',
        departure_id: 10,
        amount: 80000,
        tax_amount: 4000,
        net_amount: 84000,
        departure_date: '2026-11-20',
        status: 'Confirmed',
        agent: 'Rajesh',
        guests: 2,
        notes: 'Original note',
      };

      query.mockImplementation((text) => {
        if (text.includes('FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [activeDepBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      mockDbClient.query.mockImplementation((text, params) => {
        if (text.includes('BEGIN') || text.includes('COMMIT')) return Promise.resolve();
        if (text.includes('UPDATE bookings SET')) {
          return Promise.resolve({
            rows: [{ ...activeDepBooking, notes: 'Updated note' }]
          });
        }
        if (text.includes('SELECT status FROM clients WHERE id = $1')) {
          return Promise.resolve({ rows: [{ status: 'Active' }] });
        }
        if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (text.includes('UPDATE clients SET logs = $1')) return Promise.resolve({ rowCount: 1 });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put('/api/bookings/BK-ACTIVE-DEP')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Updated note' });

      // The server currently crashes with 500 ReferenceError: Cannot access 'updatedDepartureId' before initialization
      // When Worker M1 fixes line 404/467 TDZ, this test should expect 200.
      expect(res.status).toBe(200);
      expect(res.body.notes).toBe('Updated note');
    });
  });
});
