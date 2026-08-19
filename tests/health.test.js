import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

// Mock SMTP service calls to avoid network calls during health check test
vi.mock('../src/services/emailService.js', () => ({
  verifyConnection: vi.fn().mockResolvedValue(true),
  createTransporter: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/services/emailQueue.js', () => ({
  getQueueStats: vi.fn().mockResolvedValue({
    completed: 0,
    failed: 0,
    pending: 0,
    active: 0,
    redis: 'connected',
  }),
}));

describe('GET /api/health', () => {
  it('should return 200 OK with health status payload', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('smtpConnected', true);
    expect(res.body).toHaveProperty('smtp', 'connected');
    expect(res.body).toHaveProperty('emailQueue');
    expect(res.body.emailQueue).toHaveProperty('redis', 'connected');
    expect(res.body).toHaveProperty('duration_ms');
    expect(typeof res.body.duration_ms).toBe('number');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should return graceful degradation when getQueueStats fails', async () => {
    const { getQueueStats } = await import('../src/services/emailQueue.js');
    getQueueStats.mockRejectedValueOnce(new Error('Redis timeout'));

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.smtpConnected).toBe(true);
    // getQueueStats catches internally, so emailQueue should show fallback
    expect(res.body.emailQueue).toHaveProperty('completed', 0);
  });

  it('should include duration_ms in response', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.duration_ms).toBeGreaterThanOrEqual(0);
    expect(res.body.duration_ms).toBeLessThan(10000);
  });
});
