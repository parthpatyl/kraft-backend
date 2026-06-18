import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import packagesRouter from './routes/packages.js';
import clientsRouter from './routes/clients.js';
import bookingsRouter from './routes/bookings.js';
import settingsRouter from './routes/settings.js';
import testimonialsRouter from './routes/testimonials.js';
import uploadRouter from './routes/upload.js';
import weatherRouter from './routes/weather.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded assets statically
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Routes
app.use('/api/packages', packagesRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/weather', weatherRouter);

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
