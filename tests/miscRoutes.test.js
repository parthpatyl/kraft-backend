import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { query } from '../db/index.js';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: { query: vi.fn() },
}));

describe('Misc API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/testimonials', () => {
    it('returns list of testimonials', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Alice', location: 'NYC', avatar: 'A', rating: 5, text: 'Great tour', package: 'Kerala' }
        ]
      });

      const res = await request(app).get('/api/testimonials');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('name', 'Alice');
    });
  });

  describe('GET /api/destinations', () => {
    it('returns list of destinations extracted from packages', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { region: 'Kashmir', tour_count: 3 }
        ]
      });

      const res = await request(app).get('/api/destinations');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('region', 'Kashmir');
    });
  });

  describe('GET /api/speciality-categories', () => {
    it('returns active speciality categories sorted', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'adventure',
            name: 'Adventure',
            subtitle: 'Treks & expeditions',
            keyword: 'Adventure',
            icon_name: 'Compass',
            icon_color: 'text-blue-600',
            icon_bg: 'bg-blue-50',
            accent_color: 'text-blue-400',
            default_count: 24,
            sort_order: 1,
            is_active: true
          }
        ]
      });

      const res = await request(app).get('/api/speciality-categories');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('id', 'adventure');
    });
  });

  describe('GET /api/stats', () => {
    it('returns computed agency stats default values when DB is empty', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        tripsCrafted: 500,
        satisfaction: 98,
        destinations: 50
      });
    });
  });
});
