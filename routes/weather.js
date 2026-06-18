import { Router } from 'express';
import { query } from '../db/index.js';

const router = Router();

// Destination coordinates for Open-Meteo (representative cities)
const DESTINATION_COORDS = {
  'Europe':         { lat: 48.86, lon: 2.35,   city: 'Paris' },
  'Asia':           { lat: 13.76, lon: 100.50, city: 'Bangkok' },
  'Japan & China':  { lat: 35.68, lon: 139.69, city: 'Tokyo' },
  'America':        { lat: 40.71, lon: -74.01, city: 'New York' },
  'Africa':         { lat: -1.29, lon: 36.82,  city: 'Nairobi' },
  'South East Asia':{ lat: -8.41, lon: 115.19, city: 'Bali' },
  'Maldives':       { lat: 4.18,  lon: 73.51,  city: 'Malé' },
  'Jammu & Kashmir':{ lat: 34.08, lon: 74.80,  city: 'Srinagar' },
  'Kerala':         { lat: 9.93,  lon: 76.27,  city: 'Kochi' },
  'Andaman':        { lat: 11.67, lon: 92.74,  city: 'Port Blair' },
  'Leh Ladakh':     { lat: 34.15, lon: 77.58,  city: 'Leh' },
  'North East':     { lat: 26.14, lon: 91.74,  city: 'Guwahati' },
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
router.post('/refresh', async (req, res, next) => {
  try {
    // Check if we have a recent cache
    const existing = await query("SELECT value FROM settings WHERE key = $1", [CACHE_KEY]);
    if (existing.rows.length > 0) {
      const cached = existing.rows[0].value;
      const age = Date.now() - new Date(cached.updatedAt).getTime();
      if (age < CACHE_TTL_MS) {
        return res.json({ message: 'Weather data is still fresh (< 7 days old).', data: cached.destinations, updatedAt: cached.updatedAt });
      }
    }

    // Fetch from Open-Meteo for each destination
    const destinations = {};
    const year = new Date().getFullYear();

    for (const [name, coords] of Object.entries(DESTINATION_COORDS)) {
      try {
        const lastYear = new Date().getFullYear() - 1;
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${lastYear}-01-01&end_date=${lastYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const response = await fetch(url);

        if (!response.ok) {
          // Fallback: mark as unavailable
          destinations[name] = { city: coords.city, months: null, error: 'API unavailable' };
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

        destinations[name] = { city: coords.city, months: monthlyData };
      } catch (fetchErr) {
        destinations[name] = { city: coords.city, months: null, error: fetchErr.message };
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
