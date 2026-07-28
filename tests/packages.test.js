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

describe('Packages API Routes', () => {
  const sampleRow = {
    id: 'pkg-1',
    name: 'Kashmir Luxury Tour',
    duration: '6 Days / 5 Nights',
    region: 'Kashmir',
    base_price: 25000,
    cost_price: 18000,
    slots_booked: 2,
    slots_total: 10,
    trend: '+12%',
    inclusions_selection: {},
    hero_image: '/assets/kashmir.jpg',
    card_image: '/assets/kashmir_thumb.jpg',
    description: 'Beautiful Kashmir valley experience',
    highlights: ['Shikara ride'],
    inclusions: ['Breakfast'],
    exclusions: ['Flights'],
    itinerary: [],
    best_month: 'April',
    ctaBadge: 'Popular',
    is_bespoke: false,
    category: 'standard',
    category_ids: ['adventure'],
    tax_rate: 5,
    tax_inclusive: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-test-jwt-key-32chars-long!';
  });

  describe('GET /api/packages', () => {
    it('returns packages without costPrice for unauthenticated users', async () => {
      query.mockResolvedValueOnce({ rows: [sampleRow] });
      query.mockResolvedValueOnce({ rows: [] }); // settings query
      const res = await request(app).get('/api/packages');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('price', 25000);
      expect(res.body[0]).not.toHaveProperty('costPrice');
    });

    it('returns packages with costPrice when valid admin token is present', async () => {
      query.mockResolvedValueOnce({ rows: [sampleRow] });
      query.mockResolvedValueOnce({ rows: [] }); // settings query
      const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
      const res = await request(app)
        .get('/api/packages')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty('costPrice', 18000);
    });

    it('filters packages by region parameter', async () => {
      query.mockResolvedValueOnce({ rows: [sampleRow] });
      query.mockResolvedValueOnce({ rows: [] }); // settings query
      const res = await request(app).get('/api/packages?region=Kashmir');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('region', 'Kashmir');
    });
  });
});
