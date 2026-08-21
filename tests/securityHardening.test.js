import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
  default: { query: vi.fn() },
}));

describe('Security Hardening Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HTTP Security Headers', () => {
    it('sets standard defensive HTTP security headers on responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('CORS Whitelist Policy', () => {
    it('allows whitelisted origins (customer site)', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('allows whitelisted origins (admin dashboard)', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5174');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    });

    it('blocks untrusted third-party origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com');
      // Origin should not be reflected in access-control-allow-origin or should return 403
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Open Redirect Mitigation', () => {
    it('sanitizes input parameters in redirect endpoints', async () => {
      const res = await request(app)
        .get('/enquiry/test-123_abc')
        .expect(302);
      expect(res.headers.location).toContain('/enquiry/test-123_abc');
    });

    it('strips dangerous path traversal or URL injection characters in redirect parameter', async () => {
      const res = await request(app)
        .get('/enquiry/%2F%2Fevil.com%2Fpayload')
        .expect(302);
      expect(res.headers.location).not.toContain('//evil.com');
      expect(res.headers.location).toContain('evilcompayload');
    });
  });
});
