import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

// 1. Auth Rate Limiter — Brute force protection for login
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  skip: () => isTest
});

// 2. Public Form Submission Limiter — Anti-spam for enquiries, bookings, corporate leads
export const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 submissions per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this IP. Please try again later.' },
  skip: () => isTest
});

// 3. General API Limiter — DoS & aggressive scraping protection
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: () => isTest
});
