import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import requireAuth from './middleware/requireAuth.js';
import packagesRouter from './routes/packages.js';
import clientsRouter from './routes/clients.js';
import bookingsRouter from './routes/bookings.js';
import settingsRouter from './routes/settings.js';
import testimonialsRouter from './routes/testimonials.js';
import destinationsRouter from './routes/destinations.js';
import groupDeparturesRouter from './routes/groupDepartures.js';
import corporatePackagesRouter from './routes/corporatePackages.js';
import corporateLeadsRouter from './routes/corporateLeads.js';
import corporateClientsRouter from './routes/corporateClients.js';
import uploadRouter from './routes/upload.js';
import weatherRouter from './routes/weather.js';
import authRouter from './routes/auth.js';
import notificationsRouter from './routes/notifications.js';
import usersRouter from './routes/users.js';
import approvalsRouter from './routes/approvals.js';
import statsRouter from './routes/stats.js';
import specialityCategoriesRouter from './routes/specialityCategories.js';
import enquiryRouter from './src/routes/enquiry.routes.js';
import logger from './src/utils/logger.js';
import { verifyConnection, createTransporter } from './src/services/emailService.js';
import { getQueueStats } from './src/services/emailQueue.js';
import withTimeout from './src/utils/withTimeout.js';

import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 5000;

// Validate JWT_SECRET security configuration on startup
let jwtSecret = process.env.JWT_SECRET;
const isProd = process.env.NODE_ENV === 'production';
const placeholders = ['your-jwt-secret-here', 'your-jwt-secret-placeholder', 'placeholder', 'dev-secret'];

const isSecretWeak = !jwtSecret || jwtSecret.length < 32 || placeholders.includes(jwtSecret.toLowerCase());

if (isSecretWeak) {
  if (isProd) {
    logger.warn('WARNING: JWT_SECRET not configured or weak in production. Generating secure temporary secret.');
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  } else {
    console.warn('\n======================================================================');
    console.warn('WARNING: JWT_SECRET is not configured, is too short (< 32 chars), or');
    console.warn('uses a default placeholder value.');
    console.warn('Please update JWT_SECRET in your .env file for security.');
    console.warn('======================================================================\n');
  }
}

const app = express();
// CORS — robust cross-origin support for both customer site and admin dashboard
const corsOptions = {
  origin: true, // Dynamically allow request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Range'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Serve uploaded assets statically
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Auth routes (no auth required)
app.use('/api/auth', authRouter);

// Register API routes and apply authentication middleware selectively
app.use('/api/packages', packagesRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api/group-departures', groupDeparturesRouter);
app.use('/api/corporate-packages', corporatePackagesRouter);
app.use('/api/corporate-leads', corporateLeadsRouter);
app.use('/api/corporate-clients', corporateClientsRouter);
app.use('/api/upload', requireAuth, uploadRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/speciality-categories', specialityCategoriesRouter);

// Enquiry routes (SMTP-powered)
app.use('/api/enquiries', enquiryRouter);

// Redirect backend enquiry links to customer site
app.get('/enquiry/:id', (req, res) => {
  const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/enquiry/${req.params.id}`);
});

// Redirect backend admin enquiry links to admin site
app.get('/admin/enquiries/:id', (req, res) => {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  res.redirect(`${adminUrl}/enquiries/${req.params.id}`);
});

app.get('/enquiries/:id', (req, res) => {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  res.redirect(`${adminUrl}/enquiries/${req.params.id}`);
});

// Health check with SMTP and Redis status
app.get('/api/health', async (req, res) => {
  const start = Date.now();
  const HEALTH_TIMEOUT_MS = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS, 10) || 5000;
  const SMTP_TIMEOUT_MS = parseInt(process.env.SMTP_HEALTH_CHECK_TIMEOUT_MS, 10) || 2500;

  try {
    const [smtpOk, queueStats] = await Promise.all([
      withTimeout(verifyConnection(), SMTP_TIMEOUT_MS, 'SMTP verification')
        .then((ok) => ok)
        .catch(() => false),
      getQueueStats().catch((err) => ({
        completed: 0,
        failed: 0,
        pending: 0,
        active: 0,
        redis: 'unavailable',
        error: err.message,
      })),
    ]);

    const duration = Date.now() - start;

    if (duration > HEALTH_TIMEOUT_MS) {
      return res.status(503).json({
        status: 'degraded',
        message: 'Health check exceeded timeout',
        duration_ms: duration,
        smtp: smtpOk ? 'connected' : 'not_configured',
        emailQueue: queueStats,
        timestamp: new Date(),
      });
    }

    res.json({
      status: 'OK',
      duration_ms: duration,
      smtpConnected: smtpOk,
      smtp: smtpOk ? 'connected' : 'not_configured',
      emailQueue: queueStats,
      timestamp: new Date(),
    });
  } catch (e) {
    logger.warn('Health check error', { error: e.message });
    res.status(500).json({
      status: 'error',
      error: e.message,
      duration_ms: Date.now() - start,
      timestamp: new Date(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  logger.error('API Error', { error: err.message, stack: err.stack, method: req.method, url: req.url });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);

    // Initialize SMTP transporter on startup (non-blocking, with timeout)
    createTransporter()
      .then(() => withTimeout(verifyConnection(), 2500, 'SMTP startup check'))
      .then((ok) => {
        if (ok) {
          logger.info('SMTP ready on startup');
        } else {
          logger.warn('SMTP not available on startup - emails will retry via queue');
        }
      })
      .catch((err) => {
        logger.warn('SMTP init skipped on startup', { error: err.message });
      });
  });
}

export default app;
