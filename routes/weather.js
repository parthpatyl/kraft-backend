import { Router } from 'express';
import { query } from '../db/index.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// ── Country-based weather coordinates (one representative city per country) ──
const COUNTRY_COORDS = {
  // ─── South Asia ───
  'India':            { lat: 28.61, lon: 77.23,  city: 'New Delhi' },
  'Sri Lanka':        { lat: 6.93,  lon: 79.84,  city: 'Colombo' },
  'Nepal':            { lat: 27.72, lon: 85.32,  city: 'Kathmandu' },
  'Maldives':         { lat: 4.18,  lon: 73.51,  city: 'Malé' },
  'Bhutan':           { lat: 27.47, lon: 89.64,  city: 'Thimphu' },
  // ─── South East Asia ───
  'Thailand':         { lat: 13.76, lon: 100.50, city: 'Bangkok' },
  'Indonesia':        { lat: -8.41, lon: 115.19, city: 'Bali' },
  'Singapore':        { lat: 1.35,  lon: 103.82, city: 'Singapore' },
  'Malaysia':         { lat: 3.14,  lon: 101.69, city: 'Kuala Lumpur' },
  'Vietnam':          { lat: 21.03, lon: 105.85, city: 'Hanoi' },
  'Cambodia':         { lat: 13.36, lon: 103.86, city: 'Siem Reap' },
  'Myanmar':          { lat: 16.87, lon: 96.20,  city: 'Yangon' },
  'Philippines':      { lat: 14.60, lon: 120.98, city: 'Manila' },
  // ─── East Asia ───
  'Japan':            { lat: 35.68, lon: 139.69, city: 'Tokyo' },
  'China':            { lat: 39.90, lon: 116.40, city: 'Beijing' },
  'South Korea':      { lat: 37.57, lon: 126.98, city: 'Seoul' },
  // ─── Middle East ───
  'UAE':              { lat: 25.20, lon: 55.27,  city: 'Dubai' },
  'Oman':             { lat: 23.59, lon: 58.54,  city: 'Muscat' },
  'Jordan':           { lat: 31.95, lon: 35.93,  city: 'Amman' },
  'Turkey':           { lat: 41.01, lon: 28.98,  city: 'Istanbul' },
  // ─── Europe ───
  'France':           { lat: 48.86, lon: 2.35,   city: 'Paris' },
  'Switzerland':      { lat: 46.95, lon: 7.45,   city: 'Bern' },
  'Italy':            { lat: 41.90, lon: 12.50,  city: 'Rome' },
  'Greece':           { lat: 37.97, lon: 23.73,  city: 'Athens' },
  'Spain':            { lat: 40.42, lon: -3.70,  city: 'Madrid' },
  'Portugal':         { lat: 38.72, lon: -9.14,  city: 'Lisbon' },
  'United Kingdom':   { lat: 51.51, lon: -0.13,  city: 'London' },
  'Germany':          { lat: 52.52, lon: 13.41,  city: 'Berlin' },
  'Austria':          { lat: 48.21, lon: 16.37,  city: 'Vienna' },
  'Netherlands':      { lat: 52.37, lon: 4.90,   city: 'Amsterdam' },
  'Norway':           { lat: 59.91, lon: 10.75,  city: 'Oslo' },
  'Iceland':          { lat: 64.15, lon: -21.94, city: 'Reykjavik' },
  'Croatia':          { lat: 43.51, lon: 16.44,  city: 'Split' },
  'Czech Republic':   { lat: 50.08, lon: 14.44,  city: 'Prague' },
  // ─── Africa ───
  'Kenya':            { lat: -1.29, lon: 36.82,  city: 'Nairobi' },
  'South Africa':     { lat: -33.92, lon: 18.42, city: 'Cape Town' },
  'Tanzania':         { lat: -6.17, lon: 35.75,  city: 'Dodoma' },
  'Egypt':            { lat: 30.04, lon: 31.24,  city: 'Cairo' },
  'Morocco':          { lat: 33.97, lon: -6.85,  city: 'Rabat' },
  // ─── Americas ───
  'USA':              { lat: 40.71, lon: -74.01, city: 'New York' },
  'Canada':           { lat: 43.65, lon: -79.38, city: 'Toronto' },
  'Mexico':           { lat: 19.43, lon: -99.13, city: 'Mexico City' },
  'Brazil':           { lat: -22.90, lon: -43.17, city: 'Rio de Janeiro' },
  'Peru':             { lat: -13.53, lon: -71.97, city: 'Cusco' },
  'Argentina':        { lat: -34.60, lon: -58.38, city: 'Buenos Aires' },
  'Colombia':         { lat: 4.71,  lon: -74.07, city: 'Bogotá' },
  // ─── Oceania ───
  'Australia':        { lat: -33.86, lon: 151.20, city: 'Sydney' },
  'New Zealand':      { lat: -36.85, lon: 174.76, city: 'Auckland' },
  'Fiji':             { lat: -17.77, lon: 177.95, city: 'Suva' },
  // ─── Other ───
  'Russia':           { lat: 55.76, lon: 37.62,  city: 'Moscow' },
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CACHE_KEY = 'weather_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// GET cached weather data (served to customer site)
router.get('/', async (req, res, next) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = $1", [CACHE_KEY]);
    if (result.rows.length === 0) {
      return res.json({ data: null, message: 'No weather data cached yet. Trigger a refresh from admin.' });
    }
    const cached = result.rows[0].value;
    res.json({ data: cached.destinations, updatedAt: cached.updatedAt });
  } catch (error) {
    next(error);
  }
});

// POST trigger a weather data refresh (called from admin dashboard)
router.post('/refresh', requireAuth, async (req, res, next) => {
  try {
    // Check if we have a recent cache
    const existing = await query("SELECT value FROM settings WHERE key = $1", [CACHE_KEY]);
    if (existing.rows.length > 0) {
      const cached = existing.rows[0].value;
      const age = Date.now() - new Date(cached.updatedAt).getTime();
      if (age < CACHE_TTL_MS && !req.body?.force) {
        return res.json({ message: 'Weather data is still fresh (< 7 days old).', data: cached.destinations, updatedAt: cached.updatedAt });
      }
    }

    // Fetch from Open-Meteo for each country
    const destinations = {};

    for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
      try {
        const lastYear = new Date().getFullYear() - 1;
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${lastYear}-01-01&end_date=${lastYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const response = await fetch(url);

        if (!response.ok) {
          destinations[country] = { city: coords.city, months: null, error: 'API unavailable' };
          continue;
        }

        const data = await response.json();
        const daily = data.daily;

        // Aggregate daily data into monthly averages
        const monthlyData = [];
        for (let m = 0; m < 12; m++) {
          let maxTemps = [], minTemps = [], precip = [];
          for (let i = 0; i < (daily.time || []).length; i++) {
            const date = new Date(daily.time[i]);
            if (date.getMonth() === m) {
              if (daily.temperature_2m_max?.[i] != null) maxTemps.push(daily.temperature_2m_max[i]);
              if (daily.temperature_2m_min?.[i] != null) minTemps.push(daily.temperature_2m_min[i]);
              if (daily.precipitation_sum?.[i] != null) precip.push(daily.precipitation_sum[i]);
            }
          }
          const avgHigh = maxTemps.length ? Math.round(maxTemps.reduce((a, b) => a + b, 0) / maxTemps.length) : null;
          const avgLow = minTemps.length ? Math.round(minTemps.reduce((a, b) => a + b, 0) / minTemps.length) : null;
          const totalRain = precip.length ? Math.round(precip.reduce((a, b) => a + b, 0)) : null;

          monthlyData.push({
            month: MONTH_NAMES[m],
            avgHigh,
            avgLow,
            rainMm: totalRain
          });
        }

        destinations[country] = { city: coords.city, months: monthlyData };
      } catch (fetchErr) {
        destinations[country] = { city: coords.city, months: null, error: fetchErr.message };
      }
    }

    // Store in settings table
    const cacheValue = JSON.stringify({ destinations, updatedAt: new Date().toISOString() });
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [CACHE_KEY, cacheValue]
    );

    res.json({ message: 'Weather data refreshed successfully.', data: destinations, updatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export default router;
