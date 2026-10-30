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

describe('Empirical Adversarial & Boundary Stress Test Suite — Milestone 1', () => {
  const secret = 'super-secret-test-jwt-key-32chars-long!';
  const adminToken = jwt.sign({ id: 1, role: 'admin' }, secret);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = secret;
  });

  // =========================================================================
  // 1. ADVERSARIAL ENQUIRY SUBMISSION EDGE CASES (R9 & Joi Middleware)
  // =========================================================================
  describe('1. Adversarial Enquiry Submission Edge Cases (POST /api/enquiries/submit & Joi)', () => {
    it('1.1 Empty strings for leadSource and referralName pass validation and normalize in DB', async () => {
      let insertCaptured = null;
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('INSERT INTO enquiries')) {
          insertCaptured = params;
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO notifications')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'Sarah Connor',
          email: 'sarah@example.com',
          phone: '+14155550199',
          destination: 'Swiss Alps',
          travelDate: '2026-11-20',
          guests: 2,
          leadSource: '',
          referralName: '',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(insertCaptured).not.toBeNull();
      // Empty string should be converted to null in SQL parameters ($11, $12)
      expect(insertCaptured[10]).toBeNull(); // lead_source
      expect(insertCaptured[11]).toBeNull(); // referral_name
    });

    it('1.2 Explicit null values for leadSource and referralName are accepted safely', async () => {
      let insertCaptured = null;
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('INSERT INTO enquiries')) {
          insertCaptured = params;
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO notifications')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'Kyle Reese',
          email: 'kyle@example.com',
          phone: '+14155550188',
          destination: 'Tokyo Tour',
          travelDate: '2026-12-01',
          guests: 1,
          leadSource: null,
          referralName: null,
        });

      expect(res.status).toBe(201);
      expect(insertCaptured[10]).toBeNull();
      expect(insertCaptured[11]).toBeNull();
    });

    it('1.3 Boundary tests: exact maximum length (100 for leadSource, 255 for referralName) passes', async () => {
      let insertCaptured = null;
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('INSERT INTO enquiries')) {
          insertCaptured = params;
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO notifications')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const maxLeadSource = 'L'.repeat(100);
      const maxReferralName = 'R'.repeat(255);

      const res = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'John Connor',
          email: 'john@example.com',
          phone: '+14155550177',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-25',
          guests: 3,
          leadSource: maxLeadSource,
          referralName: maxReferralName,
        });

      expect(res.status).toBe(201);
      expect(insertCaptured[10]).toBe(maxLeadSource);
      expect(insertCaptured[11]).toBe(maxReferralName);
    });

    it('1.4 Boundary tests: 101 characters for leadSource fails validation (400)', async () => {
      const res = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'John Connor',
          email: 'john@example.com',
          phone: '+14155550177',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-25',
          guests: 2,
          leadSource: 'A'.repeat(101),
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.errors[0].field).toBe('leadSource');
      expect(res.body.errors[0].message).toMatch(/100 characters/i);
    });

    it('1.5 Boundary tests: 256 characters for referralName fails validation (400)', async () => {
      const res = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'John Connor',
          email: 'john@example.com',
          phone: '+14155550177',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-25',
          guests: 2,
          referralName: 'B'.repeat(256),
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.errors[0].field).toBe('referralName');
      expect(res.body.errors[0].message).toMatch(/255 characters/i);
    });

    it('1.6 Nested preferences boundary tests: overlength leadSource/referralName rejected', async () => {
      const req = {
        body: {
          name: 'Nested Test',
          email: 'nested@example.com',
          phone: '+14155550177',
          destination: 'Greece Odyssey',
          travelDate: '2026-11-25',
          guests: 2,
          preferences: {
            leadSource: 'X'.repeat(101),
          },
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
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'preferences.leadSource' }),
          ]),
        })
      );
    });

    it('1.7 SQL injection, XSS, and Unicode/emoji payloads in lead attribution are sanitized by parameterization', async () => {
      let insertCaptured = null;
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('INSERT INTO enquiries')) {
          insertCaptured = params;
          return Promise.resolve({ rows: [] });
        }
        if (typeof text === 'string' && text.includes('INSERT INTO notifications')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const sqlInjectionPayload = "'; DROP TABLE enquiries; --";
      const xssPayload = '<script>alert("hacked")</script> 🚀 🏖️';

      const res = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'Security Tester',
          email: 'sec@example.com',
          phone: '+14155550199',
          destination: 'Bali Special',
          travelDate: '2026-11-30',
          guests: 2,
          leadSource: sqlInjectionPayload,
          referralName: xssPayload,
        });

      expect(res.status).toBe(201);
      expect(insertCaptured[10]).toBe(sqlInjectionPayload);
      expect(insertCaptured[11]).toBe(xssPayload);
    });

    it('1.8 Unexpected non-string types (objects, arrays, booleans) for leadSource fail validation', async () => {
      const res1 = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'Type Tester',
          email: 'type@example.com',
          phone: '+14155550199',
          destination: 'Bali Special',
          travelDate: '2026-11-30',
          leadSource: { malicious: 'object' },
        });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'Type Tester',
          email: 'type@example.com',
          phone: '+14155550199',
          destination: 'Bali Special',
          travelDate: '2026-11-30',
          leadSource: ['array', 'injection'],
        });
      expect(res2.status).toBe(400);

      const res3 = await request(app)
        .post('/api/enquiries/submit')
        .send({
          name: 'Type Tester',
          email: 'type@example.com',
          phone: '+14155550199',
          destination: 'Bali Special',
          travelDate: '2026-11-30',
          leadSource: false,
        });
      expect(res3.status).toBe(400);
    });
  });

  // =========================================================================
  // 2. ADVERSARIAL ITINERARY DOWNLOAD BOOKING INQUIRY (R7 & Date Relaxation)
  // =========================================================================
  describe('2. Adversarial Itinerary Download Booking Inquiry (POST /api/bookings/inquiry & Date Edge Cases)', () => {
    it('2.1 Itinerary download with completely omitted startDate and endDate succeeds with auto-defaulted dates', async () => {
      query.mockImplementation((text, params) => {
        if (typeof text === 'string' && text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 'pkg-norway', name: 'Norway Fjords', base_price: 80000, tax_rate: 5, duration: '7 Days', is_bespoke: false }],
          });
        }
        if (typeof text === 'string' && text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { group_discount_enabled: false } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      let insertedBooking = null;
      let insertedLog = null;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (typeof text === 'string' && text.includes('BEGIN')) return Promise.resolve();
          if (typeof text === 'string' && text.includes('SELECT * FROM clients WHERE email = $1')) {
            return Promise.resolve({ rows: [] }); // New client
          }
          if (typeof text === 'string' && text.includes('INSERT INTO clients')) {
            return Promise.resolve({ rows: [{ id: 'C-AUTO-1', name: 'Gated Lead', email: 'gated@example.com' }] });
          }
          if (typeof text === 'string' && text.includes('UPDATE packages SET slots_booked')) {
            return Promise.resolve({ rows: [{ slots_booked: 1 }] });
          }
          if (typeof text === 'string' && text.includes('INSERT INTO bookings')) {
            insertedBooking = params;
            return Promise.resolve({
              rows: [{
                id: 'BK-DOWNLOAD-1',
                client_name: 'Gated Lead',
                client_id: 'C-AUTO-1',
                package_name: 'Norway Fjords',
                package_id: 'pkg-norway',
                amount: 80000,
                tax_amount: 4000,
                net_amount: 84000,
                start_date: params[17],
                end_date: params[18],
                lead_source: params[20],
                referral_name: params[21],
                status: 'Pending',
              }],
            });
          }
          if (typeof text === 'string' && text.includes('SELECT logs FROM clients')) {
            return Promise.resolve({ rows: [{ logs: [] }] });
          }
          if (typeof text === 'string' && text.includes('UPDATE clients SET logs = $1')) {
            insertedLog = JSON.parse(params[0]);
            return Promise.resolve();
          }
          if (typeof text === 'string' && text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Gated Lead',
          email: 'gated@example.com',
          phone: '+14155559988',
          packageId: 'pkg-norway',
          leadSource: 'Itinerary Download',
          referralName: 'Agent Cooper',
          // Note: startDate and endDate omitted!
        });

      expect(res.status).toBe(201);
      expect(res.body.booking.leadSource).toBe('Itinerary Download');
      expect(insertedBooking[20]).toBe('Itinerary Download'); // lead_source
      expect(insertedBooking[21]).toBe('Agent Cooper'); // referral_name

      // Verify dates were defaulted to local today
      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(insertedBooking[17]).toBeDefined(); // start_date
      expect(insertedBooking[18]).toBeDefined(); // end_date
      expect(insertedBooking[17]).toBe(localTodayStr);

      // Verify specific itinerary download log entry
      expect(insertedLog).not.toBeNull();
      expect(insertedLog[0].text).toContain('Captured lead via Itinerary Download for "Norway Fjords"');
      expect(mockDbClient.release).toHaveBeenCalled();
    });

    it('2.2 Whitespace-only start and end dates on itinerary download are safely defaulted', async () => {
      query.mockImplementation((text) => {
        if (text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 'pkg-norway', name: 'Norway Fjords', base_price: 80000, tax_rate: 5, duration: '7 Days', is_bespoke: false }],
          });
        }
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: {} }] });
        }
        return Promise.resolve({ rows: [] });
      });

      let insertedBooking = null;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('SELECT * FROM clients WHERE email = $1')) {
            return Promise.resolve({ rows: [{ id: 'C-1', name: 'Gated Lead', email: 'gated@example.com' }] });
          }
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve({ rows: [{ slots_booked: 1 }] });
          if (text.includes('INSERT INTO bookings')) {
            insertedBooking = params;
            return Promise.resolve({
              rows: [{
                id: 'BK-WS-1',
                client_name: 'Gated Lead',
                package_name: 'Norway Fjords',
                amount: 80000,
                status: 'Pending',
              }],
            });
          }
          if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
          if (text.includes('UPDATE clients')) return Promise.resolve();
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Whitespace Traveler',
          email: 'ws@example.com',
          phone: '+14155559988',
          packageId: 'pkg-norway',
          inquirySource: 'itinerary_download',
          startDate: '   ',
          endDate: '   ',
        });

      expect(res.status).toBe(201);
      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(insertedBooking[17]).toBe(localTodayStr);
    });

    it('2.3 Non-itinerary inquiry with whitespace or missing dates is strictly rejected (400)', async () => {
      const resMissing = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Standard Traveler',
          email: 'standard@example.com',
          phone: '+14155559988',
          packageId: 'pkg-norway',
          leadSource: 'Instagram', // Normal booking inquiry
          // dates omitted
        });
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toMatch(/start date is required/i);

      const resWhitespace = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Standard Traveler',
          email: 'standard@example.com',
          phone: '+14155559988',
          packageId: 'pkg-norway',
          leadSource: 'Instagram',
          startDate: '   ',
          endDate: '2026-12-01',
        });
      expect(resWhitespace.status).toBe(400);
      expect(resWhitespace.body.error).toMatch(/invalid start date format/i);
    });

    it('2.4 Timezone resilience: ISO strings with UTC, +05:30, and -05:00 offsets are parsed and accepted', async () => {
      query.mockImplementation((text) => {
        if (text.includes('FROM packages WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: 'pkg-tz', name: 'Timezone Tour', base_price: 50000, tax_rate: 5, duration: '5 Days', is_bespoke: false }],
          });
        }
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: {} }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('SELECT * FROM clients')) return Promise.resolve({ rows: [{ id: 'C-TZ', name: 'TZ User' }] });
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve({ rows: [{ slots_booked: 1 }] });
          if (text.includes('INSERT INTO bookings')) {
            return Promise.resolve({ rows: [{ id: 'BK-TZ-1', status: 'Pending', amount: 50000 }] });
          }
          if (text.includes('SELECT logs FROM clients')) return Promise.resolve({ rows: [{ logs: [] }] });
          if (text.includes('UPDATE clients')) return Promise.resolve();
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };

      // Test future UTC ISO date
      getClient.mockResolvedValueOnce(mockDbClient);
      const resUtc = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Utc User',
          email: 'utc@example.com',
          phone: '+14155559988',
          packageId: 'pkg-tz',
          startDate: '2026-11-20T00:00:00.000Z',
          endDate: '2026-11-25T23:59:59.000Z',
        });
      expect(resUtc.status).toBe(201);

      // Test future Indian Standard Time (+05:30) date
      getClient.mockResolvedValueOnce(mockDbClient);
      const resIst = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Ist User',
          email: 'ist@example.com',
          phone: '+14155559988',
          packageId: 'pkg-tz',
          startDate: '2026-11-20T10:30:00+05:30',
          endDate: '2026-11-25T18:00:00+05:30',
        });
      expect(resIst.status).toBe(201);

      // Test future US Eastern Time (-05:00) date
      getClient.mockResolvedValueOnce(mockDbClient);
      const resEst = await request(app)
        .post('/api/bookings/inquiry')
        .send({
          name: 'Est User',
          email: 'est@example.com',
          phone: '+14155559988',
          packageId: 'pkg-tz',
          startDate: '2026-11-20T08:00:00-05:00',
          endDate: '2026-11-25T17:00:00-05:00',
        });
      expect(resEst.status).toBe(201);
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL BOOKING CANCELLATION REASON & STATE SYNC (R6, R8, PUT)
  // =========================================================================
  describe('3. Adversarial Booking Cancellation Reason & State Sync (PUT /api/bookings/:id)', () => {
    it('3.1 Persists cancellationReason, leadSource, and referralName on booking update', async () => {
      const currentBooking = {
        id: 'BK-UPDATE-1',
        client_name: 'Kavita Sharma',
        client_id: 'C-KAVITA',
        package_name: 'Greece Odyssey',
        package_id: 'pkg-greece',
        departure_id: null,
        status: 'Confirmed',
        amount: 60000,
        tax_amount: 3000,
        net_amount: 63000,
        guests: 2,
        cancellation_reason: null,
        lead_source: null,
        referral_name: null,
      };

      query.mockImplementation((text, params) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) {
          return Promise.resolve({ rows: [currentBooking] });
        }
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) {
          return Promise.resolve({ rows: [{ value: { inrToUsdRate: 0.012 } }] });
        }
        return Promise.resolve({ rows: [] });
      });

      let updatedBookingParams = null;
      let clientStatusUpdatedTo = null;

      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
          if (text.includes('UPDATE bookings SET')) {
            updatedBookingParams = params;
            return Promise.resolve({
              rows: [{
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: params[20],
                lead_source: params[21],
                referral_name: params[22],
              }],
            });
          }
          if (text.includes("SELECT COUNT(*)::int AS count FROM bookings WHERE client_id = $1 AND status != 'Cancelled'")) {
            // No other active bookings remain
            return Promise.resolve({ rows: [{ count: 0 }] });
          }
          if (text.includes("UPDATE clients SET status = 'Cancelled'")) {
            clientStatusUpdatedTo = 'Cancelled';
            return Promise.resolve();
          }
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-UPDATE-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: 'Flight cancelled by airline and customer requested full refund',
          leadSource: 'Referral',
          referralName: 'Dr. Anita Desai',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Cancelled');
      expect(res.body.cancellationReason).toBe('Flight cancelled by airline and customer requested full refund');
      expect(res.body.leadSource).toBe('Referral');
      expect(res.body.referralName).toBe('Dr. Anita Desai');
      expect(res.body.clientStatus).toBe('Cancelled');
      expect(clientStatusUpdatedTo).toBe('Cancelled');
      expect(mockDbClient.release).toHaveBeenCalled();
    });

    it('3.2 Accepts snake_case cancellation_reason, lead_source, referral_name for API compatibility', async () => {
      const currentBooking = {
        id: 'BK-SNAKE-1',
        client_name: 'Test Snake',
        client_id: 'C-SNAKE',
        package_name: 'Tour',
        package_id: 'pkg-1',
        departure_id: null,
        status: 'Pending',
        guests: 1,
        amount: 20000,
        cancellation_reason: null,
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [currentBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
          if (text.includes('UPDATE bookings SET')) {
            return Promise.resolve({
              rows: [{
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: params[20],
                lead_source: params[21],
                referral_name: params[22],
              }],
            });
          }
          if (text.includes('SELECT COUNT(*)::int')) return Promise.resolve({ rows: [{ count: 0 }] });
          if (text.includes('UPDATE clients')) return Promise.resolve();
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-SNAKE-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellation_reason: 'Snake case cancellation reason',
          lead_source: 'Walk-in',
          referral_name: 'Front Desk Walk-in',
        });

      expect(res.status).toBe(200);
      expect(res.body.cancellationReason).toBe('Snake case cancellation reason');
      expect(res.body.leadSource).toBe('Walk-in');
      expect(res.body.referralName).toBe('Front Desk Walk-in');
    });

    it('3.3 Extremely long cancellation reason (5,000+ characters) is safely supported in TEXT column', async () => {
      const currentBooking = {
        id: 'BK-LONG-1',
        client_name: 'Verbose Client',
        client_id: 'C-VERBOSE',
        package_name: 'Tour',
        package_id: 'pkg-1',
        departure_id: null,
        status: 'Confirmed',
        guests: 1,
        amount: 20000,
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [currentBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const longReason = 'Cancelled reason: '.padEnd(5200, 'Detailed log notes and explanation. ');

      let savedReason = null;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
          if (text.includes('UPDATE bookings SET')) {
            savedReason = params[20];
            return Promise.resolve({
              rows: [{
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: params[20],
              }],
            });
          }
          if (text.includes('SELECT COUNT(*)::int')) return Promise.resolve({ rows: [{ count: 0 }] });
          if (text.includes('UPDATE clients')) return Promise.resolve();
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-LONG-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: longReason,
        });

      expect(res.status).toBe(200);
      expect(savedReason).toBe(longReason);
      expect(savedReason.length).toBeGreaterThan(5000);
      expect(res.body.cancellationReason).toBe(longReason);
    });

    it('3.4 Special characters, quotes, and HTML/emojis in cancellation reason are parameterized safely', async () => {
      const currentBooking = {
        id: 'BK-SPECIAL-1',
        client_name: 'Special User',
        client_id: 'C-SPEC',
        package_name: 'Tour',
        package_id: 'pkg-1',
        departure_id: null,
        status: 'Pending',
        guests: 1,
        amount: 20000,
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [currentBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      const adversarialReason = "Reason: Client said \"Can't make it!\"; -- DROP TABLE bookings; 😷 🚑 <script>alert(1)</script>";

      let savedReason = null;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
          if (text.includes('UPDATE bookings SET')) {
            savedReason = params[20];
            return Promise.resolve({
              rows: [{
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: params[20],
              }],
            });
          }
          if (text.includes('SELECT COUNT(*)::int')) return Promise.resolve({ rows: [{ count: 0 }] });
          if (text.includes('UPDATE clients')) return Promise.resolve();
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-SPECIAL-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: adversarialReason,
        });

      expect(res.status).toBe(200);
      expect(savedReason).toBe(adversarialReason);
      expect(res.body.cancellationReason).toBe(adversarialReason);
    });

    it('3.5 Client status remains Active if client has other active bookings', async () => {
      const currentBooking = {
        id: 'BK-MULTI-1',
        client_name: 'Multi Trip Client',
        client_id: 'C-MULTI',
        package_name: 'Tour 1',
        package_id: 'pkg-1',
        departure_id: null,
        status: 'Confirmed',
        guests: 1,
        amount: 20000,
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [currentBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      let clientUpdated = false;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
          if (text.includes('UPDATE bookings SET')) {
            return Promise.resolve({
              rows: [{
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: 'Trip 1 cancelled, but Trip 2 is active',
              }],
            });
          }
          if (text.includes("SELECT COUNT(*)::int AS count FROM bookings WHERE client_id = $1 AND status != 'Cancelled'")) {
            // Client still has 1 remaining active booking!
            return Promise.resolve({ rows: [{ count: 1 }] });
          }
          if (text.includes("UPDATE clients SET status = 'Cancelled'")) {
            clientUpdated = true;
            return Promise.resolve();
          }
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-MULTI-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: 'Trip 1 cancelled, but Trip 2 is active',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Cancelled');
      expect(res.body.clientStatus).toBe('Active'); // Stays Active
      expect(clientUpdated).toBe(false); // UPDATE clients SET status = 'Cancelled' was NOT called
    });

    it('3.6 Handles empty string and explicit null cancellation reasons safely', async () => {
      const currentBooking = {
        id: 'BK-EMPTY-1',
        client_name: 'Empty Reason User',
        client_id: 'C-EMP',
        package_name: 'Tour',
        package_id: 'pkg-1',
        status: 'Pending',
        guests: 1,
        amount: 20000,
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [currentBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      let savedReason = undefined;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
          if (text.includes('UPDATE bookings SET')) {
            savedReason = params[20];
            return Promise.resolve({
              rows: [{
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: params[20],
              }],
            });
          }
          if (text.includes('SELECT COUNT(*)::int')) return Promise.resolve({ rows: [{ count: 0 }] });
          if (text.includes('UPDATE clients')) return Promise.resolve();
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-EMPTY-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: '',
        });

      expect(res.status).toBe(200);
      expect(savedReason).toBe('');
      expect(res.body.status).toBe('Cancelled');
    });

    it('3.7 Handles whitespace-only cancellation reason without crashing', async () => {
      const currentBooking = {
        id: 'BK-WS-REASON',
        client_name: 'Whitespace Reason User',
        client_id: 'C-WSR',
        package_name: 'Tour',
        package_id: 'pkg-1',
        status: 'Confirmed',
        guests: 1,
        amount: 20000,
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [currentBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      let savedReason = undefined;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked')) return Promise.resolve();
          if (text.includes('UPDATE bookings SET')) {
            savedReason = params[20];
            return Promise.resolve({
              rows: [{
                ...currentBooking,
                status: 'Cancelled',
                cancellation_reason: params[20],
              }],
            });
          }
          if (text.includes('SELECT COUNT(*)::int')) return Promise.resolve({ rows: [{ count: 0 }] });
          if (text.includes('UPDATE clients')) return Promise.resolve();
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-WS-REASON')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: '    ',
        });

      expect(res.status).toBe(200);
      expect(savedReason).toBe('    ');
      expect(res.body.status).toBe('Cancelled');
    });

    it('3.8 Status transition from Cancelled to Confirmed reclaims slots and restores Client to Active', async () => {
      const cancelledBooking = {
        id: 'BK-REOPEN-1',
        client_name: 'Reopened Client',
        client_id: 'C-REOPEN',
        package_name: 'Tour',
        package_id: 'pkg-1',
        departure_id: null,
        status: 'Cancelled',
        guests: 3,
        amount: 60000,
      };

      query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM bookings WHERE id = $1')) return Promise.resolve({ rows: [cancelledBooking] });
        if (text.includes("FROM settings WHERE key = 'agency_settings'")) return Promise.resolve({ rows: [{ value: {} }] });
        return Promise.resolve({ rows: [] });
      });

      let slotsAdded = false;
      let clientRestoredActive = false;
      const mockDbClient = {
        query: vi.fn().mockImplementation((text, params) => {
          if (text.includes('BEGIN')) return Promise.resolve();
          if (text.includes('UPDATE packages SET slots_booked = slots_booked + $1')) {
            slotsAdded = true;
            return Promise.resolve();
          }
          if (text.includes('UPDATE bookings SET')) {
            return Promise.resolve({
              rows: [{
                ...cancelledBooking,
                status: 'Confirmed',
                client_status: 'Active',
              }],
            });
          }
          if (text.includes("UPDATE clients SET status = 'Active'")) {
            clientRestoredActive = true;
            return Promise.resolve();
          }
          if (text.includes('COMMIT')) return Promise.resolve();
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      getClient.mockResolvedValueOnce(mockDbClient);

      const res = await request(app)
        .put('/api/bookings/BK-REOPEN-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Confirmed',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Confirmed');
      expect(slotsAdded).toBe(true);
      expect(clientRestoredActive).toBe(true);
      expect(res.body.clientStatus).toBe('Active');
    });

    it('3.9 Converting an enquiry to booking transfers lead_source and referral_name', async () => {
      const mockEnquiry = {
        id: 'ENQ-CONV-1',
        name: 'Lead Convert',
        email: 'convert@example.com',
        phone: '+14155550188',
        destination: 'Swiss Tour',
        travel_date: '2026-11-20',
        guests: 2,
        notes: 'VIP trip',
        lead_source: 'LinkedIn',
        referral_name: 'VP Sales',
        status: 'logged',
      };

      let insertedBooking = null;
      query.mockImplementation((text, params) => {
        if (text.includes('SELECT * FROM enquiries WHERE id = $1')) {
          return Promise.resolve({ rows: [mockEnquiry] });
        }
        if (text.includes('FROM clients WHERE')) {
          return Promise.resolve({ rows: [{ id: 'C-CONV', name: 'Lead Convert', email: 'convert@example.com' }] });
        }
        if (text.includes('INSERT INTO bookings')) {
          insertedBooking = params;
          return Promise.resolve({
            rows: [{
              id: 'BK-CONV-99',
              client_name: mockEnquiry.name,
              package_name: mockEnquiry.destination,
              status: 'confirmed',
              lead_source: params[20], // lead_source is param $21
              referral_name: params[21], // referral_name is param $22
            }],
          });
        }
        if (text.includes('UPDATE enquiries SET status = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (text.includes('INSERT INTO notifications')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/enquiries/ENQ-CONV-1/convert-to-booking')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(insertedBooking).not.toBeNull();
      // Verify lead_source and referral_name were passed into INSERT INTO bookings ($21, $22)
      expect(insertedBooking[20]).toBe('LinkedIn');
      expect(insertedBooking[21]).toBe('VP Sales');
    });
  });

  // =========================================================================
  // 4. MAPPER INTEGRITY & PERSISTENCE CONTRACTS
  // =========================================================================
  describe('4. Frontend Mapping & Contract Verification', () => {
    it('mapBookingToFrontend preserves null for missing attributes cleanly', () => {
      const bareRow = {
        id: 'BK-BARE-1',
        client_name: 'Bare Traveler',
        client_id: 'C-BARE',
        package_name: 'Bare Package',
        amount: 10000,
        status: 'Pending',
      };

      const mapped = mapBookingToFrontend(bareRow, {});
      expect(mapped.cancellationReason).toBeNull();
      expect(mapped.leadSource).toBeNull();
      expect(mapped.referralName).toBeNull();
      expect(mapped.agent).toBe('Unassigned');
      expect(mapped.guests).toBe(1);
    });

    it('mapBookingToFrontend accurately exposes cancellationReason, leadSource, and referralName', () => {
      const fullRow = {
        id: 'BK-FULL-1',
        client_name: 'Full Traveler',
        client_id: 'C-FULL',
        package_name: 'Full Package',
        amount: 50000,
        tax_amount: 2500,
        net_amount: 52500,
        status: 'Cancelled',
        cancellation_reason: 'Client medical emergency',
        lead_source: 'LinkedIn',
        referral_name: 'Corporate Partner HR',
        departure_date: '2026-12-15',
      };

      const mapped = mapBookingToFrontend(fullRow, {});
      expect(mapped.cancellationReason).toBe('Client medical emergency');
      expect(mapped.leadSource).toBe('LinkedIn');
      expect(mapped.referralName).toBe('Corporate Partner HR');
      expect(mapped.status).toBe('Cancelled');
    });
  });
});
