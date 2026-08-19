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

describe('Empirical Adversarial Stress Test Suite — Milestone 1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
  });

  describe('1. Concurrency & Slot Race Conditions in POST /api/bookings/inquiry', () => {
    it('Rolls back package slot deduction when departure slots are exhausted', async () => {
      // Setup: Package has 10 slots free, Departure has only 1 slot left. User requests 2 guests.
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM group_departures WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 42, price_modifier: 1000, slots_total: 20, slots_booked: 19 }]
          });
        }
        if (typeof text === 'string' && text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 'pkg-ladakh', name: 'Ladakh Explorer', base_price: 40000, tax_rate: 5, duration: '6 Days', is_bespoke: false }]
          });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { group_discount_enabled: false, inrToUsdRate: 0 } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      let rolledBack = false;
      let committed = false;

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) {
          return Promise.resolve();
        }
        if (typeof text === 'string' && text.includes('SELECT * FROM clients WHERE email = $1')) {
          return Promise.resolve({ rows: [{ id: 'C-99', name: 'Alice Test', email: 'alice@example.com' }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE clients')) {
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) {
          // Package update succeeds
          return Promise.resolve({ rows: [{ slots_booked: 12 }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE group_departures SET slots_booked')) {
          // Departure has only 1 slot left, but 2 requested -> 0 rows updated!
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('ROLLBACK')) {
          rolledBack = true;
          return Promise.resolve();
        }
        if (typeof text === 'string' && text.includes('COMMIT')) {
          committed = true;
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Alice Test',
          email: 'alice@example.com',
          phone: '+919876543210',
          packageId: 'pkg-ladakh',
          departureId: 42,
          startDate: '2026-09-20',
          endDate: '2026-09-25',
          guests: 2
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Not enough slots remaining for this departure date.');
      expect(rolledBack).toBe(true);
      expect(committed).toBe(false);
      expect(mockDbClient.release).toHaveBeenCalled();
    });

    it('Handles non-existent departureId by rejecting and rolling back cleanly', async () => {
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM group_departures WHERE id = $1')) {
          return Promise.resolve({ rows: [] }); // Not found
        }
        if (typeof text === 'string' && text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 'pkg-ladakh', name: 'Ladakh Explorer', base_price: 40000, tax_rate: 5, duration: '6 Days', is_bespoke: false }]
          });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { group_discount_enabled: false } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      let rolledBack = false;
      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('SELECT * FROM clients')) {
          return Promise.resolve({ rows: [{ id: 'C-99', name: 'Alice Test', email: 'alice@example.com' }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) {
          return Promise.resolve({ rows: [{ slots_booked: 2 }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE group_departures SET slots_booked')) {
          // ID 99999 does not exist, 0 rows returned
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('ROLLBACK')) {
          rolledBack = true;
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Alice Test',
          email: 'alice@example.com',
          phone: '+919876543210',
          packageId: 'pkg-ladakh',
          departureId: 99999,
          startDate: '2026-09-20',
          endDate: '2026-09-25',
          guests: 1
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Not enough slots remaining for this departure date.');
      expect(rolledBack).toBe(true);
    });
  });

  describe('2. Booking Edge Cases & Input Validation', () => {
    it('Rejects inquiry with past startDate', async () => {
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Alice Test',
          email: 'alice@example.com',
          phone: '+919876543210',
          packageId: 'pkg-ladakh',
          startDate: '2020-01-01',
          endDate: '2020-01-05'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/past/i);
    });

    it('Rejects inquiry with endDate before startDate', async () => {
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Alice Test',
          email: 'alice@example.com',
          phone: '+919876543210',
          packageId: 'pkg-ladakh',
          startDate: '2026-10-10',
          endDate: '2026-10-05'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/before/i);
    });

    it('Rejects inquiry with numbers or invalid symbols in name', async () => {
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Alice123 <script>',
          email: 'alice@example.com',
          phone: '+919876543210',
          packageId: 'pkg-ladakh',
          startDate: '2026-10-10',
          endDate: '2026-10-15'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/only contain letters and spaces/i);
    });

    it('Applies group discount correctly when guest threshold is met with departure price modifier', async () => {
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM group_departures WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 5, price_modifier: 5000, slots_total: 50, slots_booked: 0 }]
          });
        }
        if (typeof text === 'string' && text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 'pkg-kashmir', name: 'Kashmir Luxury Experience', base_price: 30000, tax_rate: 5, duration: '5 Days', is_bespoke: false }]
          });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({
            rows: [{
              value: {
                group_discount_enabled: true,
                group_discount_threshold: 10,
                group_discount_percent: 10,
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
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('SELECT * FROM clients WHERE email = $1')) {
          return Promise.resolve({ rows: [{ id: 'C-10', name: 'Group Organizer', email: 'group@example.com' }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) return Promise.resolve({ rows: [{ slots_booked: 10 }] });
        if (typeof text === 'string' && text.includes('UPDATE group_departures SET slots_booked')) return Promise.resolve({ rows: [{ id: 5 }] });
        if (typeof text === 'string' && text.includes('INSERT INTO bookings')) {
          // Calculation:
          // base = 30000 + 5000 = 35000 per guest.
          // For 10 guests = 350000.
          // 10% discount = 35000.
          // 5% tax on numericAmount (350000 * 0.05) = 17500.
          // netAmount = 350000 - 35000 + 17500 = 332500.
          return Promise.resolve({
            rows: [{
              id: 'BK-GRP-1',
              client_name: 'Group Organizer',
              client_id: 'C-10',
              package_name: 'Kashmir Luxury Experience',
              package_id: 'pkg-kashmir',
              departure_id: 5,
              amount: 350000,
              tax_amount: 17500,
              net_amount: 332500,
              discount_type: 'group',
              discount_value: 35000,
              departure_date: '2026-10-01',
              status: 'Pending',
              agent: 'Unassigned',
              guests: 10
            }]
          });
        }
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
        if (typeof text === 'string' && text.includes('UPDATE clients')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Group Organizer',
          email: 'group@example.com',
          phone: '+919876543210',
          packageId: 'pkg-kashmir',
          departureId: 5,
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          guests: 10
        });

      expect(res.status).toBe(201);
      expect(res.body.booking).toHaveProperty('amount', 350000);
      expect(res.body.booking).toHaveProperty('discountType', 'group');
      expect(res.body.booking).toHaveProperty('discountValue', 35000);
      expect(res.body.booking).toHaveProperty('taxAmount', 17500);
      expect(res.body.booking).toHaveProperty('netAmount', 332500);
      expect(res.body.message).toMatch(/10% group discount/i);
    });
  });

  describe('3. Schema Compatibility & camelCase Field Preservation', () => {
    it('Correctly preserves and maps all 19 fields for group departures', async () => {
      const departureDbRow = {
        id: 7,
        package_id: 'pkg-rajasthan',
        title: 'Royal Heritage Tour',
        departure_date: '2026-11-10',
        return_date: '2026-11-18',
        slots_total: 25,
        slots_booked: 8,
        price_modifier: -1500, // Discount modifier
        cost_price: 22000,
        cta_badge: 'Best Seller',
        inclusions: ['Heritage Fort Passes', 'Palace Stays'],
        exclusions: ['Flight tickets'],
        highlights: ['Udaipur Lake Palace', 'Jaipur City Palace'],
        itinerary: [{ day: 1, title: 'Arrival in Jaipur', description: 'Meet & Greet' }],
        status: 'confirmed',
        notes: 'VIP guide assigned',
        terms_and_conditions: 'Standard terms apply',
        package_name: 'Royal Rajasthan',
        package_region: 'Rajasthan',
        package_duration: '9 Days / 8 Nights',
        package_card_image: '/assets/rajasthan.jpg',
        package_base_price: 55000
      };

      query.mockResolvedValueOnce({ rows: [departureDbRow] });

      const res = await request(app).get('/api/group-departures/7');
      expect(res.status).toBe(200);

      const d = res.body;
      expect(d.id).toBe(7);
      expect(d.packageId).toBe('pkg-rajasthan');
      expect(d.packageName).toBe('Royal Rajasthan');
      expect(d.packageRegion).toBe('Rajasthan');
      expect(d.packageDuration).toBe('9 Days / 8 Nights');
      expect(d.packageCardImage).toBe('/assets/rajasthan.jpg');
      expect(d.packageBasePrice).toBe(55000);
      expect(d.title).toBe('Royal Heritage Tour');
      expect(d.departureDate).toBe('2026-11-10');
      expect(d.returnDate).toBe('2026-11-18');
      expect(d.slots).toEqual({ booked: 8, total: 25 });
      expect(d.priceModifier).toBe(-1500);
      expect(d.costPrice).toBe(22000);
      expect(d.ctaBadge).toBe('Best Seller');
      expect(d.inclusions).toEqual(['Heritage Fort Passes', 'Palace Stays']);
      expect(d.exclusions).toEqual(['Flight tickets']);
      expect(d.highlights).toEqual(['Udaipur Lake Palace', 'Jaipur City Palace']);
      expect(d.itinerary).toEqual([{ day: 1, title: 'Arrival in Jaipur', description: 'Meet & Greet' }]);
      expect(d.status).toBe('confirmed');
      expect(d.notes).toBe('VIP guide assigned');
      expect(d.termsAndConditions).toBe('Standard terms apply');
    });

    it('Allows partial updates and retains unmodified departure properties', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      const existing = {
        id: 7,
        package_id: 'pkg-rajasthan',
        title: 'Royal Heritage Tour',
        departure_date: '2026-11-10',
        return_date: '2026-11-18',
        slots_total: 25,
        slots_booked: 8,
        price_modifier: -1500,
        cost_price: 22000,
        cta_badge: 'Best Seller',
        inclusions: ['Passes'],
        exclusions: ['Flights'],
        highlights: ['Palaces'],
        itinerary: '[]',
        status: 'confirmed',
        notes: 'VIP guide assigned',
        terms_and_conditions: 'Standard terms',
        package_name: 'Royal Rajasthan',
        package_region: 'Rajasthan',
        package_duration: '9 Days',
        package_card_image: '/assets/rajasthan.jpg',
        package_base_price: 55000
      };

      query.mockResolvedValueOnce({ rows: [existing] }); // Current SELECT
      query.mockResolvedValueOnce({ rows: [] }); // UPDATE execution
      query.mockResolvedValueOnce({ rows: [{ ...existing, status: 'completed' }] }); // Full return SELECT

      const res = await request(app)
        .put('/api/group-departures/7')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.title).toBe('Royal Heritage Tour');
      expect(res.body.priceModifier).toBe(-1500);
    });
  });
});
