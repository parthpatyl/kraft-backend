import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function cleanEnvStr(val, fallback = '') {
  if (!val) return fallback;
  return val.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

const emailConfig = {
  host: cleanEnvStr(process.env.GOOGLE_SMTP_HOST, 'smtp.gmail.com'),
  port: parseInt(process.env.GOOGLE_SMTP_PORT, 10) || 587,
  secure: parseInt(process.env.GOOGLE_SMTP_PORT, 10) === 465,
  auth: {
    user: cleanEnvStr(process.env.GOOGLE_SMTP_USER, ''),
    pass: cleanEnvStr(process.env.GOOGLE_SMTP_PASSWORD, ''),
  },
  fromName: cleanEnvStr(process.env.SMTP_FROM_NAME, 'Kraft Your Trip'),
  fromEmail: cleanEnvStr(process.env.SMTP_FROM_EMAIL) || cleanEnvStr(process.env.GOOGLE_SMTP_USER, ''),
  adminEmail: cleanEnvStr(process.env.ADMIN_EMAIL, 'info@kraftyourtrip.com'),
  appUrl: cleanEnvStr(process.env.APP_URL, 'http://localhost:5000'),
  adminUrl: cleanEnvStr(process.env.ADMIN_URL) || cleanEnvStr(process.env.APP_URL, 'http://localhost:5000'),
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
};

export default emailConfig;
