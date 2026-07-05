import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createTransporter, verifyConnection, sendEmail, renderTemplate } from '../src/services/emailService.js';
import logger from '../src/utils/logger.js';

async function testEmailService() {
  console.log('\n========================================');
  console.log('  Kraft Your Trip - Email Service Test');
  console.log('========================================\n');

  const testEnquiry = {
    id: 'ENQ-TEST-A1B2C3',
    name: 'John Doe',
    email: process.env.ADMIN_EMAIL || 'test@example.com',
    phone: '+1234567890',
    destination: 'Bali, Indonesia',
    travelDate: '2026-08-15',
    guests: 2,
    notes: 'Looking for a luxury honeymoon package with private villa.',
    submittedAt: new Date().toISOString(),
  };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('❌ ADMIN_EMAIL not set in .env');
    process.exit(1);
  }

  if (!process.env.GOOGLE_SMTP_USER || !process.env.GOOGLE_SMTP_PASSWORD) {
    console.error('❌ GOOGLE_SMTP_USER or GOOGLE_SMTP_PASSWORD not set in .env');
    process.exit(1);
  }

  // Step 1: Create transporter
  console.log('1️⃣  Creating SMTP transporter...');
  try {
    await createTransporter();
    console.log('   ✅ Transporter created\n');
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}\n`);
    process.exit(1);
  }

  // Step 2: Verify SMTP connection
  console.log('2️⃣  Verifying SMTP connection...');
  const connected = await verifyConnection();
  if (connected) {
    console.log('   ✅ SMTP connection verified\n');
  } else {
    console.error('   ❌ SMTP connection failed. Check credentials.\n');
    process.exit(1);
  }

  // Step 2.5: Save test enquiry to database so it can be fetched in the UI
  console.log('2️⃣.5️⃣  Saving test enquiry to database...');
  try {
    const { query } = await import('../db/index.js');
    await query(
      `INSERT INTO enquiries (id, name, email, phone, destination, travel_date, guests, notes, preferences, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         destination = EXCLUDED.destination,
         travel_date = EXCLUDED.travel_date,
         guests = EXCLUDED.guests,
         notes = EXCLUDED.notes,
         preferences = EXCLUDED.preferences,
         submitted_at = EXCLUDED.submitted_at`,
      [
        testEnquiry.id,
        testEnquiry.name,
        testEnquiry.email,
        testEnquiry.phone,
        testEnquiry.destination,
        testEnquiry.travelDate,
        testEnquiry.guests,
        testEnquiry.notes,
        JSON.stringify({ accommodations: 'luxury', dietary: 'None', activities: ['private villa', 'spa treatments'] }),
        testEnquiry.submittedAt
      ]
    );
    console.log('   ✅ Test enquiry saved/updated in database\n');

    console.log('2️⃣.7️⃣  Saving test notification to database...');
    await query(
      `INSERT INTO notifications (message, type, link_url, link_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [
        `New travel enquiry received for ${testEnquiry.destination} from ${testEnquiry.name} (${testEnquiry.id})`,
        'enquiry',
        `enquiry:${testEnquiry.id}`,
        'enquiry'
      ]
    );
    console.log('   ✅ Test notification saved in database\n');
  } catch (err) {
    console.warn(`   ⚠️ Warning: Could not save test data to database: ${err.message}\n`);
  }

  // Step 3: Render templates
  console.log('3️⃣  Rendering email templates...');
  try {
    const customerHtml = renderTemplate('enquiryConfirmation', {
      enquiry: testEnquiry,
      appUrl: process.env.APP_URL || 'http://localhost:5000',
      year: new Date().getFullYear(),
    });
    console.log('   ✅ Customer confirmation template rendered');

    const adminHtml = renderTemplate('enquiryNotification', {
      enquiry: testEnquiry,
      appUrl: process.env.APP_URL || 'http://localhost:5000',
      adminUrl: (process.env.APP_URL || 'http://localhost:5000') + '/admin',
      year: new Date().getFullYear(),
    });
    console.log('   ✅ Admin notification template rendered\n');
  } catch (err) {
    console.error(`   ❌ Template error: ${err.message}\n`);
    process.exit(1);
  }

  // Step 4: Send emails
  console.log('4️⃣  Sending test emails...');

  try {
    console.log('   → Customer confirmation...');
    await sendEmail({
      to: adminEmail,
      subject: `[TEST] Enquiry Confirmation #${testEnquiry.id} - Kraft Your Trip`,
      html: renderTemplate('enquiryConfirmation', {
        enquiry: testEnquiry,
        appUrl: process.env.APP_URL || 'http://localhost:5000',
        year: new Date().getFullYear(),
      }),
    });
    console.log('   ✅ Customer confirmation sent\n');
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}\n`);
    process.exit(1);
  }

  try {
    console.log('   → Admin notification...');
    await sendEmail({
      to: adminEmail,
      subject: `[TEST] [NEW ENQUIRY] ${testEnquiry.destination} - ${testEnquiry.name}`,
      html: renderTemplate('enquiryNotification', {
        enquiry: testEnquiry,
        appUrl: process.env.APP_URL || 'http://localhost:5000',
        adminUrl: (process.env.APP_URL || 'http://localhost:5000') + '/admin',
        year: new Date().getFullYear(),
      }),
      replyTo: testEnquiry.email,
      priority: 'high',
    });
    console.log('   ✅ Admin notification sent\n');
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}\n`);
    process.exit(1);
  }

  console.log('========================================');
  console.log('  ✅ ALL TESTS PASSED');
  console.log('========================================\n');
  console.log(`  Emails sent to: ${adminEmail}`);
  console.log(`  Check logs/combined.log for details\n`);
  process.exit(0);
}

testEmailService();
