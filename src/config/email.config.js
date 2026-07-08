import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const emailConfig = {
  host: process.env.GOOGLE_SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.GOOGLE_SMTP_PORT, 10) || 587,
  secure: parseInt(process.env.GOOGLE_SMTP_PORT, 10) === 465,
  auth: {
    user: process.env.GOOGLE_SMTP_USER || '',
    pass: process.env.GOOGLE_SMTP_PASSWORD || '',
  },
  fromName: process.env.SMTP_FROM_NAME || 'Kraft Your Trip',
  fromEmail: process.env.SMTP_FROM_EMAIL || process.env.GOOGLE_SMTP_USER || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  adminUrl: process.env.ADMIN_URL || process.env.APP_URL || 'http://localhost:5000',
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
};

export default emailConfig;
