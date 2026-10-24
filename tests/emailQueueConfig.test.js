import { describe, it, expect } from 'vitest';
import emailConfig from '../src/config/email.config.js';

describe('Email Configuration and Redis Sanitization', () => {
  it('emailConfig should load and sanitize properties without wrapping quotes', () => {
    expect(typeof emailConfig.host).toBe('string');
    expect(emailConfig.host).not.toMatch(/^['"].*['"]$/);
    expect(emailConfig.auth.pass).not.toMatch(/^['"].*['"]$/);
    expect(emailConfig.fromName).not.toMatch(/^['"].*['"]$/);
  });
});
