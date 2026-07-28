import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
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
});
