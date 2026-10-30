import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateName,
  validateNumber,
  validatePrice,
  validateGuests,
  validatePercentage,
  validateRating,
  validateInteger
} from '../src/utils/validation.js';

describe('Backend Validation Utilities', () => {
  describe('Email Validation', () => {
    it('accepts valid RFC-compliant emails', () => {
      expect(validateEmail('hello@kraftyourtrip.com').isValid).toBe(true);
      expect(validateEmail('traveler.vip@company.co.uk').isValid).toBe(true);
    });

    it('rejects invalid or malformed emails', () => {
      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail('not-an-email').isValid).toBe(false);
      expect(validateEmail('user@').isValid).toBe(false);
      expect(validateEmail('@domain.com').isValid).toBe(false);
    });

    it('blocks disposable email providers', () => {
      expect(validateEmail('test@mailinator.com').isValid).toBe(false);
      expect(validateEmail('user@tempmail.com').isValid).toBe(false);
      expect(validateEmail('hacker@throwawaymail.com').isValid).toBe(false);
    });

    it('blocks dummy email addresses', () => {
      expect(validateEmail('test@test.com').isValid).toBe(false);
      expect(validateEmail('dummy@dummy.com').isValid).toBe(false);
    });
  });

  describe('Phone Number & Country Code (India 10 digits)', () => {
    it('enforces exact 10 digits when country code is India (+91)', () => {
      const valid = validatePhone('9876543210', '+91');
      expect(valid.isValid).toBe(true);
      expect(valid.cleanDigits).toBe('9876543210');
      expect(valid.formatted).toBe('+919876543210');

      const shortNum = validatePhone('987654321', '+91');
      expect(shortNum.isValid).toBe(false);
      expect(shortNum.error).toMatch(/Indian phone numbers must be exactly 10 digits/i);

      const longNum = validatePhone('98765432100', '+91');
      expect(longNum.isValid).toBe(false);
      expect(longNum.error).toMatch(/Indian phone numbers must be exactly 10 digits/i);
    });

    it('handles E.164 raw numbers with country prefix', () => {
      expect(validatePhone('+919876543210').isValid).toBe(true);
      expect(validatePhone('+12025550188').isValid).toBe(true);
      expect(validatePhone('+447911123456').isValid).toBe(true);
    });

    it('blocks dummy phone numbers with identical or ascending sequential digits', () => {
      expect(validatePhone('0000000000', '+91').isValid).toBe(false);
      expect(validatePhone('9999999999', '+91').isValid).toBe(false);
      expect(validatePhone('1234567890', '+91').isValid).toBe(false);
    });
  });

  describe('Numerical Field Bounds', () => {
    it('validates prices (must be non-negative numbers)', () => {
      expect(validatePrice(0).isValid).toBe(true);
      expect(validatePrice(9999).isValid).toBe(true);
      expect(validatePrice(-1).isValid).toBe(false);
      expect(validatePrice('abc').isValid).toBe(false);
    });

    it('validates guest counts (1 to 500 integers)', () => {
      expect(validateGuests(1).isValid).toBe(true);
      expect(validateGuests(50).isValid).toBe(true);
      expect(validateGuests(0).isValid).toBe(false);
      expect(validateGuests(-1).isValid).toBe(false);
      expect(validateGuests(2.5).isValid).toBe(false);
    });

    it('validates percentages (0 to 100)', () => {
      expect(validatePercentage(0).isValid).toBe(true);
      expect(validatePercentage(18).isValid).toBe(true);
      expect(validatePercentage(100).isValid).toBe(true);
      expect(validatePercentage(-1).isValid).toBe(false);
      expect(validatePercentage(101).isValid).toBe(false);
    });

    it('validates ratings (1 to 5 integers)', () => {
      expect(validateRating(1).isValid).toBe(true);
      expect(validateRating(5).isValid).toBe(true);
      expect(validateRating(0).isValid).toBe(false);
      expect(validateRating(6).isValid).toBe(false);
      expect(validateRating(4.5).isValid).toBe(false);
    });
  });
});
