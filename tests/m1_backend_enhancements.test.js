import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import { query, getClient } from '../db/index.js';
import validateEnquiry from '../src/middlewares/enquiryValidation.js';
import { mapBookingToFrontend } from '../routes/bookings.js';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: { query: vi.fn() },
}));

describe('Milestone 1: Backend Core, Schema Migrations & API Endpoints', () => {
  const secret = 'super-secret-test-jwt-key-32chars-long!';
  const adminToken = jwt.sign({ id: 1, role: 'admin' }, secret);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = secret;
  });

  describe('1. Joi Validation Middleware (enquiryValidation.js)', () => {
    it('accepts and preserves leadSource and referralName at root level', async () => {
      const req = {
        body: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+15551234567',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-15',
          guests: 2,
          notes: 'Looking for a relaxing tour',
          leadSource: 'Instagram',
          referralName: 'Kavita Sharma',
        },
      };
      let nextCalled = false;
      const res = {};
      const next = () => { nextCalled = true; };

      validateEnquiry(req, res, next);
      expect(nextCalled).toBe(true);
      expect(req.validatedBody).toBeDefined();
      expect(req.validatedBody.leadSource).toBe('Instagram');
      expect(req.validatedBody.referralName).toBe('Kavita Sharma');
    });

    it('accepts leadSource and referralName inside preferences object', async () => {
      const req = {
        body: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+15551234567',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-15',
          guests: 2,
          preferences: {
            accommodations: 'luxury',
            leadSource: 'Referral',
            referralName: 'Rahul Verma',
          },
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      validateEnquiry(req, {}, next);
      expect(nextCalled).toBe(true);
      expect(req.validatedBody.preferences.leadSource).toBe('Referral');
      expect(req.validatedBody.preferences.referralName).toBe('Rahul Verma');
    });

    it('rejects leadSource exceeding 100 characters', async () => {
      const req = {
        body: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+15551234567',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-15',
          guests: 2,
          leadSource: 'A'.repeat(101),
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      validateEnquiry(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Validation failed',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'leadSource' }),
          ]),
        })
      );
    });

    it('allows null or empty leadSource and referralName', async () => {
      const req = {
        body: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+15551234567',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-15',
          guests: 2,
          leadSource: '',
          referralName: null,
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      validateEnquiry(req, {}, next);
      expect(nextCalled).toBe(true);
      expect(req.validatedBody.leadSource).toBe('');
      expect(req.validatedBody.referralName).toBeNull();
    });
  });

  describe('2. Enquiries Controller (enquiryController.js)', () => {
    it('POST /api/enquiries/submit persists leadSource and referralName to DB', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // insert enquiry
      query.mockResolvedValueOnce({ rows: [] }); // insert notification

      const res = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'Pooja Patel',
          email: 'pooja@example.com',
          phone: '+919876543210',
          destination: 'Switzerland Alps',
          travelDate: '2026-12-01',
          guests: 4,
          leadSource: 'Referral',
          referralName: 'Kavita Patel',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO enquiries'),
        expect.arrayContaining(['Referral', 'Kavita Patel'])
      );
    });

    it('GET /api/enquiries returns mapped leadSource and referralName', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'ENQ-TEST-1',
            name: 'Pooja Patel',
            email: 'pooja@example.com',
            phone: '+919876543210',
            destination: 'Switzerland Alps',
            travel_date: '2026-12-01',
            guests: 4,
            notes: 'Family trip',
            preferences: null,
            status: 'logged',
            lead_source: 'LinkedIn',
            referral_name: null,
            submitted_at: '2026-10-29T10:00:00.000Z',
          },
          {
            id: 'ENQ-TEST-2',
            name: 'Aarav Mehta',
            email: 'aarav@example.com',
            phone: '+919876543211',
            destination: 'Dubai Luxury',
            travel_date: '2026-12-10',
            guests: 2,
            notes: '',
            preferences: null,
            status: 'converted',
            lead_source: 'Referral',
            referral_name: 'Dr. Suresh Mehta',
            submitted_at: '2026-10-29T11:00:00.000Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/enquiries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('leadSource', 'LinkedIn');
      expect(res.body.data[0]).toHaveProperty('referralName', null);
      expect(res.body.data[1]).toHaveProperty('leadSource', 'Referral');
      expect(res.body.data[1]).toHaveProperty('referralName', 'Dr. Suresh Mehta');
    });

    it('GET /api/enquiries/:id returns leadSource and referralName for single enquiry', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'ENQ-SINGLE',
            name: 'Deepak Chopra',
            email: 'deepak@example.com',
            phone: '+14155550199',
            destination: 'Himalayan Retreat',
            travel_date: '2026-11-20',
            guests: 1,
            notes: 'Meditation retreat',
            preferences: null,
            status: 'logged',
            lead_source: 'Google/Search',
            referral_name: null,
            submitted_at: '2026-10-29T12:00:00.000Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/enquiries/ENQ-SINGLE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('leadSource', 'Google/Search');
      expect(res.body.data).toHaveProperty('referralName', null);
    });

    it('POST /api/enquiries/:id/convert copies leadSource and referralName to booking record', async () => {
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM enquiries WHERE id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 'ENQ-TO-CONVERT',
                name: 'Neha Roy',
                email: 'neha@example.com',
                phone: '+919988776655',
                destination: 'Bali Honeymoon',
                travel_date: '2027-02-14',
                guests: 2,
                notes: 'Pool villa',
                lead_source: 'Referral',
                referral_name: 'Priyanka Roy',
              },
            ],
          });
        }
        if (typeof text === 'string' && text.includes('FROM clients WHERE LOWER(email)')) {
          return Promise.resolve({
            rows: [{ id: 'CLI-NEHA', name: 'Neha Roy', email: 'neha@example.com' }],
          });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO bookings')) {
          return Promise.resolve({
            rows: [
              {
                id: 'BK-CONVERTED',
                client_name: 'Neha Roy',
                client_id: 'CLI-NEHA',
                lead_source: params[20],
                referral_name: params[21],
                status: 'Confirmed',
              },
            ],
          });
        }
        if (typeof text === 'string' && text.includes("UPDATE enquiries SET status = $1")) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/enquiries/ENQ-TO-CONVERT/convert-to-booking')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.lead_source).toBe('Referral');
      expect(res.body.data.booking.referral_name).toBe('Priyanka Roy');
    });
  });

  describe('3. Bookings Frontend Mapping (mapBookingToFrontend)', () => {
    it('correctly maps cancellationReason, leadSource, and referralName', () => {
      const dbRow = {
        id: 'BK-1234',
        client_name: 'Kavita Sharma',
        client_id: 'CLI-KAVITA',
        client_email: 'kavita@example.com',
        client_phone: '+919876500000',
        client_tier: 'Gold',
        client_status: 'Cancelled',
        package_name: 'Greece & Turkey Odyssey',
        package_id: 'pkg-greece',
        departure_id: null,
        amount: 150000,
        tax_amount: 7500,
        net_amount: 157500,
        departure_date: '2026-11-10',
        status: 'Cancelled',
        agent: 'Rajesh',
        guests: 2,
        cancellation_reason: 'Client requested postponement due to medical emergency',
        lead_source: 'Referral',
        referral_name: 'Anand Kumar',
      };

      const mapped = mapBookingToFrontend(dbRow);
      expect(mapped).toHaveProperty('cancellationReason', 'Client requested postponement due to medical emergency');
      expect(mapped).toHaveProperty('leadSource', 'Referral');
      expect(mapped).toHaveProperty('referralName', 'Anand Kumar');
      expect(mapped).toHaveProperty('clientStatus', 'Cancelled');
    });

    it('defaults cancellationReason, leadSource, and referralName to null when missing', () => {
      const dbRow = {
        id: 'BK-LEGACY',
        client_name: 'Legacy Traveler',
        amount: 20000,
        departure_date: '2026-10-01',
        status: 'Confirmed',
      };

      const mapped = mapBookingToFrontend(dbRow);
      expect(mapped.cancellationReason).toBeNull();
      expect(mapped.leadSource).toBeNull();
      expect(mapped.referralName).toBeNull();
    });
  });

  describe('4. Client Status Sync & Cancellation Reason (PUT /api/bookings/:id)', () => {
    it('updates cancellationReason, leadSource, and referralName on booking', async () => {
      const currentBooking = {
        id: 'BK-KAVITA-1',
        client_name: 'Kavita',
        client_id: 'CLI-KAVITA',
        package_name: 'Greece Odyssey',
        package_id: 'pkg-greece',
        departure_id: null,
        amount: 120000,
        tax_amount: 6000,
        net_amount: 126000,
        departure_date: '2026-11-20',
        status: 'Confirmed',
        agent: 'Rajesh',
        guests: 2,
        notes: '',
        cancellation_reason: null,
        lead_source: 'Walk-in',
        referral_name: null,
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [currentBooking] });
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
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: 'Client schedule conflict',
                lead_source: 'Referral',
                referral_name: 'Sunita Rao',
              },
            ],
          });
        }
        if (typeof text === 'string' && text.includes('COUNT(*)::int AS count FROM bookings WHERE client_id')) {
          // 0 remaining non-cancelled bookings
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
        .put('/api/bookings/BK-KAVITA-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: 'Client schedule conflict',
          leadSource: 'Referral',
          referralName: 'Sunita Rao',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'Cancelled');
      expect(res.body).toHaveProperty('cancellationReason', 'Client schedule conflict');
      expect(res.body).toHaveProperty('leadSource', 'Referral');
      expect(res.body).toHaveProperty('referralName', 'Sunita Rao');
      expect(res.body).toHaveProperty('clientStatus', 'Cancelled');

      // Verify slot release was invoked
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE packages SET slots_booked = GREATEST(0, slots_booked - $1) WHERE id = $2'),
        [2, 'pkg-greece']
      );

      // Verify client status was updated to Cancelled
      expect(mockDbClient.query).toHaveBeenCalledWith(
        "UPDATE clients SET status = 'Cancelled' WHERE id = $1",
        ['CLI-KAVITA']
      );
    });

    it('does NOT set client status to Cancelled if client has another active non-cancelled booking', async () => {
      const currentBooking = {
        id: 'BK-MULTI-1',
        client_name: 'Frequent Flyer',
        client_id: 'CLI-FF',
        package_name: 'Tour A',
        package_id: 'pkg-a',
        departure_id: null,
        status: 'Confirmed',
        guests: 1,
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [currentBooking] });
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
            rows: [{ ...currentBooking, status: 'Cancelled', cancellation_reason: 'Trip postponed' }],
          });
        }
        if (typeof text === 'string' && text.includes('COUNT(*)::int AS count FROM bookings WHERE client_id')) {
          // Client has 1 other active booking
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
          cancellationReason: 'Trip postponed',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'Cancelled');
      expect(res.body).toHaveProperty('clientStatus', 'Active');
      // Should NOT have run UPDATE clients SET status = 'Cancelled'
      expect(mockDbClient.query).not.toHaveBeenCalledWith(
        "UPDATE clients SET status = 'Cancelled' WHERE id = $1",
        ['CLI-FF']
      );
    });

    it('successfully updates an active non-cancelled booking with notes, guests, and departure without ReferenceError', async () => {
      const activeBooking = {
        id: 'BK-ACTIVE-REGRESSION',
        client_name: 'Priya Sharma',
        client_id: 'CLI-PRIYA-1',
        package_name: 'Kerala Serenity',
        package_id: 'pkg-kerala',
        departure_id: 10,
        amount: 60000,
        tax_amount: 3000,
        net_amount: 63000,
        departure_date: '2026-11-20',
        status: 'Confirmed',
        agent: 'Rajesh',
        guests: 2,
        notes: 'Initial notes',
        group_members: [],
        special_directives: [],
        cancellation_reason: null,
        lead_source: 'Website',
        referral_name: null,
      };

      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [activeBooking] });
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
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) {
          return Promise.resolve({ rows: [{ slots_booked: 3 }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE group_departures SET slots_booked = GREATEST')) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (typeof text === 'string' && text.includes('UPDATE group_departures SET slots_booked = slots_booked + $1')) {
          return Promise.resolve({ rows: [{ slots_booked: 3 }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE bookings SET')) {
          return Promise.resolve({
            rows: [
              {
                ...activeBooking,
                status: 'Confirmed',
                notes: 'Updated active notes without TDZ error',
                guests: 3,
                departure_id: 12,
              },
            ],
          });
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
        .put('/api/bookings/BK-ACTIVE-REGRESSION')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Confirmed',
          notes: 'Updated active notes without TDZ error',
          guests: 3,
          departureId: 12,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'BK-ACTIVE-REGRESSION');
      expect(res.body).toHaveProperty('status', 'Confirmed');
      expect(res.body).toHaveProperty('notes', 'Updated active notes without TDZ error');
      expect(res.body).toHaveProperty('guests', 3);
      expect(res.body).toHaveProperty('departureId', 12);
      expect(res.body).toHaveProperty('clientStatus', 'Active');
      expect(res.body).not.toHaveProperty('error');
    });
  });

  describe('5. Itinerary Download Gated Lead Capture (POST /api/bookings/inquiry)', () => {
    it('relaxes date requirement and defaults dates when leadSource is "Itinerary Download"', async () => {
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 'pkg-greece',
                name: 'Greece Odyssey',
                duration: '7 Days',
                base_price: 65000,
                tax_rate: 5,
                is_bespoke: false,
              },
            ],
          });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({
            rows: [{ value: { group_discount_enabled: false, inrToUsdRate: 0 } }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      getClient.mockResolvedValue(mockDbClient);

      let savedBooking = null;
      let savedLogText = null;

      mockDbClient.query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
        if (typeof text === 'string' && text.includes('SELECT * FROM clients WHERE email = $1')) {
          return Promise.resolve({ rows: [] }); // create new client
        }
        if (typeof text === 'string' && text.includes('INSERT INTO clients')) {
          return Promise.resolve({
            rows: [{ id: 'C-NEW-1', name: 'Rohan Mehra', email: 'rohan@example.com' }],
          });
        }
        if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) {
          return Promise.resolve({ rows: [{ slots_booked: 1 }] });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO bookings')) {
          savedBooking = {
            id: params[0],
            client_name: params[1],
            client_id: params[2],
            package_name: params[3],
            startDate: params[11],
            lead_source: params[20],
            referral_name: params[21],
          };
          return Promise.resolve({ rows: [savedBooking] });
        }
        if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) {
          return Promise.resolve({ rows: [{ logs: [] }] });
        }
        if (typeof text === 'string' && text.includes('UPDATE clients SET logs = $1')) {
          const logs = JSON.parse(params[0]);
          savedLogText = logs[0]?.text;
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rows: [] });
      });

      // Guest submits contact details without startDate and endDate to download itinerary
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Rohan Mehra',
          email: 'rohan@example.com',
          phone: '+919876543210',
          packageId: 'pkg-greece',
          leadSource: 'Itinerary Download',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(savedBooking).not.toBeNull();
      expect(savedBooking.lead_source).toBe('Itinerary Download');
      expect(savedBooking.startDate).toBeDefined();
      expect(savedLogText).toContain('Captured lead via Itinerary Download');
    });

    it('rejects inquiry when startDate is missing and not Itinerary Download', async () => {
      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Rohan Mehra',
          email: 'rohan@example.com',
          phone: '+919876543210',
          packageId: 'pkg-greece',
          // No startDate or endDate, and leadSource is standard
          leadSource: 'Google/Search',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Start date is required');
    });
  });

  describe('6. Tour Highlights Navigation CMS Support (routes/navigation.js)', () => {
    it('GET /api/navigation returns navigation hierarchy with tour highlights', async () => {
      const mockNav = [
        {
          id: 'group_tours',
          label: 'Group Tours',
          type: 'dropdown',
          tourHighlights: [
            { title: 'Athens Acropolis Private Guided Tour', destination: 'Greece' },
            { title: 'Santorini Sunset Catamaran Cruise', destination: 'Greece' },
          ],
        },
      ];
      query.mockResolvedValueOnce({ rows: [{ value: mockNav }] });

      const res = await request(app).get('/api/navigation');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockNav);
      expect(res.body[0].tourHighlights).toHaveLength(2);
      expect(res.body[0].tourHighlights[0].title).toBe('Athens Acropolis Private Guided Tour');
    });

    it('PUT /api/navigation preserves tour highlights in array structure', async () => {
      const updatedNav = [
        {
          id: 'group_tours',
          label: 'Group Tours',
          type: 'dropdown',
          tourHighlights: [
            { title: 'Northern Lights Superjeep Safari', destination: 'Iceland' },
          ],
        },
      ];

      query.mockResolvedValueOnce({ rows: [{ value: updatedNav }] });

      const res = await request(app)
        .put('/api/navigation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedNav);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedNav);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO settings (key, value)"),
        [JSON.stringify(updatedNav)]
      );
    });

    it('PUT /api/navigation preserves tour highlights when passed via object wrapper', async () => {
      const menu = [
        { id: 'group_tours', label: 'Group Tours', type: 'dropdown' },
      ];
      const tourHighlights = [
        { title: 'Tuscany Chianti Wine Tasting', destination: 'Italy' },
      ];

      const expectedSavedMenu = [
        {
          id: 'group_tours',
          label: 'Group Tours',
          type: 'dropdown',
          tourHighlights,
        },
      ];

      query.mockResolvedValueOnce({ rows: [{ value: expectedSavedMenu }] });

      const res = await request(app)
        .put('/api/navigation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          menu,
          tourHighlights,
        });

      expect(res.status).toBe(200);
      expect(res.body[0].tourHighlights).toEqual(tourHighlights);
    });
  });
});
