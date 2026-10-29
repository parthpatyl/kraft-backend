import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import { query } from '../db/index.js';
import { DEFAULT_NAVIGATION_MENU } from '../data/defaultNavigation.js';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: { query: vi.fn() },
}));

describe('Navigation API Routes', () => {
  const secret = 'super-secret-test-jwt-key-32chars-long!';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = secret;
  });

  describe('GET /api/navigation', () => {
    it('returns auto-seeded default navigation if none exists in database', async () => {
      query.mockResolvedValueOnce({ rows: [] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // INSERT

      const res = await request(app).get('/api/navigation');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id).toBe('india');
    });

    it('returns existing navigation menu from database if present', async () => {
      const mockMenu = [{ id: 'custom', label: 'Custom Destination', type: 'link', page: 'destinations' }];
      query.mockResolvedValueOnce({ rows: [{ value: mockMenu }] });

      const res = await request(app).get('/api/navigation');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockMenu);
    });
  });

  describe('PUT /api/navigation', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .put('/api/navigation')
        .send([{ id: 'test' }]);
      expect(res.status).toBe(401);
    });

    it('rejects unauthorized users lacking write:settings permission with 403', async () => {
      const userToken = jwt.sign({ id: 2, role: 'sales' }, secret);
      const res = await request(app)
        .put('/api/navigation')
        .set('Authorization', `Bearer ${userToken}`)
        .send([{ id: 'test' }]);
      expect(res.status).toBe(403);
    });

    it('updates navigation successfully when authorized as admin', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, secret);
      const updatedMenu = [{ id: 'india', label: 'Incredible India', type: 'megamenu', visible: true }];
      query.mockResolvedValueOnce({ rows: [{ value: updatedMenu }] });

      const res = await request(app)
        .put('/api/navigation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedMenu);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedMenu);
    });
  });

  describe('POST /api/navigation/reset', () => {
    it('resets navigation back to defaults when authorized', async () => {
      const adminToken = jwt.sign({ id: 1, role: 'admin' }, secret);
      query.mockResolvedValueOnce({ rows: [{ value: DEFAULT_NAVIGATION_MENU }] });

      const res = await request(app)
        .post('/api/navigation/reset')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe('india');
    });
  });
});
