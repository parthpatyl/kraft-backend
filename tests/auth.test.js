import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import { query } from '../db/index.js';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: { query: vi.fn() },
}));

describe('Auth API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 if email or password missing', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email and password are required');
    });

    it('returns 401 for non-existent email', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('returns token and user payload for valid credentials', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Admin User', email: 'admin@kraft.com', password_hash: hash, role: 'admin' }]
      });
      query.mockResolvedValueOnce({ rows: [] }); // UPDATE last_active_at

      const res = await request(app).post('/api/auth/login').send({ email: 'admin@kraft.com', password: 'secret123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual({ id: 1, name: 'Admin User', email: 'admin@kraft.com', role: 'admin' });
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when no token provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns authenticated user details when valid token provided', async () => {
      const token = jwt.sign({ id: 1, name: 'Admin', role: 'admin' }, process.env.JWT_SECRET);
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('name', 'Admin');
    });
  });
});
