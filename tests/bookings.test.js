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

describe('Bookings API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
  });

  describe('POST /api/bookings/inquiry', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/bookings/inquiry').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Name is required');
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(app).post('/api/bookings/inquiry').send({
        name: 'John Doe',
        email: 'invalid-email',
        phone: '+15550192831',
        packageId: 'pkg-1',
        startDate: '2026-10-01',
        endDate: '2026-10-05'
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'A valid email is required');
    });

    it('returns 400 when phone number format is invalid', async () => {
      const res = await request(app).post('/api/bookings/inquiry').send({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '12345',
        packageId: 'pkg-1',
        startDate: '2026-10-01',
        endDate: '2026-10-05'
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'A valid phone number is required (country code + at least 7 digits)');
    });
  });

  describe('GET /api/bookings', () => {
    it('returns bookings with departureId mapped properly', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      query.mockResolvedValueOnce({
        rows: [{
          id: 'BK-1',
          client_name: 'Jane Doe',
          client_id: 'C-1',
          package_name: 'Goa Holiday',
          package_id: 'pkg-goa',
          departure_id: 5,
          amount: 50000,
          tax_amount: 2500,
          net_amount: 52500,
          departure_date: '2026-11-01',
          status: 'Confirmed',
          agent: 'Agent 1',
          guests: 2
        }]
      });
      query.mockResolvedValueOnce({ rows: [{ value: { inrToUsdRate: 0 } }] });

      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('departureId', 5);
      expect(res.body[0]).toHaveProperty('client', 'Jane Doe');
      expect(res.body[0]).toHaveProperty('package', 'Goa Holiday');
    });
  });
});
