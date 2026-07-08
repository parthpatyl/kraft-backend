import { query } from '../db/index.js';
import { sendEmail } from '../src/services/emailService.js';

export async function notifyUser({ userId, message, type = 'system', link }) {
  try {
    const linkType = link ? (link.includes(':') ? link.split(':')[0] : null) : null;
    await query(
      `INSERT INTO notifications (message, type, user_id, link_url, link_type) VALUES ($1, $2, $3, $4, $5)`,
      [message, type, userId, link || null, linkType]
    );
  } catch (err) {
    console.error('[notify] DB insert failed:', err.message);
  }
}

export async function notifyClientLog(clientId, text) {
  try {
    const res = await query('SELECT logs FROM clients WHERE id = $1', [clientId]);
    if (res.rows.length === 0) return;
    const logs = res.rows[0].logs || [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = [{ time: timestamp, text }, ...logs];
    await query(
      `UPDATE clients SET logs = $1, last_contact = $2 WHERE id = $3`,
      [JSON.stringify(updated), timestamp.split(' ')[0], clientId]
    );
  } catch (err) {
    console.error('[notify] client log failed:', err.message);
  }
}

export async function notifyEmail(to, subject, text) {
  try {
    await sendEmail({
      to,
      subject,
      text
    });
  } catch (err) {
    console.error('[notify] email send failed:', err.message);
  }
}

export async function notifyAll({ userId, userEmail, clientId, message, subject, logText, link }) {
  await Promise.allSettled([
    notifyUser({ userId, message, link }),
    clientId ? notifyClientLog(clientId, logText || message) : Promise.resolve(),
    userEmail ? notifyEmail(userEmail, subject || 'Kraft Your Trip — Notification', message) : Promise.resolve()
  ]);
}
