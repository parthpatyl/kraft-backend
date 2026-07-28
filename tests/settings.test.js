import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import { query } from '../db/index.js';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: { query: vi.fn() },
}));

describe('Settings API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
  });

  describe('GET /api/settings', () => {
    it('returns redacted public agency settings for guest users', async () => {
      query.mockResolvedValue({ rows: [] });

      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('agencyName', 'KRAFT YOUR TRIP');
      expect(res.body).not.toHaveProperty('defaultMarkup');
    });

    it('returns full settings including financials for authenticated admin', async () => {
      query.mockResolvedValue({ rows: [] });
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);

      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('agencyName', 'KRAFT YOUR TRIP');
      expect(res.body).toHaveProperty('defaultMarkup', 15);
    });
  });
});
