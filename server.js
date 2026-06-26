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
import uploadRouter from './routes/upload.js';
import weatherRouter from './routes/weather.js';
import authRouter from './routes/auth.js';
import notificationsRouter from './routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allow both frontend origins
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
}));

app.use(express.json());

// Serve uploaded assets statically
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Auth routes (no auth required)
app.use('/api/auth', authRouter);

// Register API routes and apply authentication middleware selectively
app.use('/api/packages', packagesRouter);
app.use('/api/clients', requireAuth, clientsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/upload', requireAuth, uploadRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/notifications', notificationsRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
