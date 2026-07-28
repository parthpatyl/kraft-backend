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

describe('Clients API Routes', () => {
  let adminToken;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
    adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
  });

  describe('GET /api/clients', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/clients');
      expect(res.status).toBe(401);
    });

    it('returns formatted client records for authenticated admin', async () => {
      const clientRow = {
        id: 'cli-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+15551234567',
        status: 'Active',
        tier: 'Gold',
        historical_ltv: 45000,
        historical_bookings_count: 2,
        avatar: '/avatars/jane.jpg',
        preferences: {},
        passport: {},
        visa: {},
        emergency_contact: {},
        wallet_balance: 500,
        notes: '',
        logs: [],
        created_at: new Date()
      };

      query.mockResolvedValueOnce({ rows: [clientRow] });
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('id', 'cli-1');
      expect(res.body[0]).toHaveProperty('name', 'Jane Smith');
    });
  });
});
