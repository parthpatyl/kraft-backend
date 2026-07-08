import nodemailer from 'nodemailer';
import pug from 'pug';
import path from 'path';
import { fileURLToPath } from 'url';
import emailConfig from '../config/email.config.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateDir = path.join(__dirname, 'templates');

let transporter = null;

export async function createTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
    pool: emailConfig.pool,
    maxConnections: emailConfig.maxConnections,
    maxMessages: emailConfig.maxMessages,
    rateDelta: emailConfig.rateDelta,
    rateLimit: emailConfig.rateLimit,
    tls: {
      rejectUnauthorized: true,
    },
  });

  transporter.on('error', (err) => {
    logger.error('SMTP Transport Error', { error: err.message, stack: err.stack });
  });

  logger.info('SMTP Transporter Initialized', {
    host: emailConfig.host,
    port: emailConfig.port,
    user: emailConfig.auth.user,
    pool: emailConfig.pool,
    maxConnections: emailConfig.maxConnections,
  });

  return transporter;
}

export async function verifyConnection() {
  try {
    if (!transporter) {
      await createTransporter();
    }
    await transporter.verify();
    logger.info('SMTP Connection Verified Successfully');
    return true;
  } catch (err) {
    logger.error('SMTP Connection Verification Failed', {
      error: err.message,
      code: err.code,
    });
    return false;
  }
}

export function renderTemplate(templateName, data) {
  const templatePath = path.join(templateDir, `${templateName}.pug`);
  try {
    const compiled = pug.compileFile(templatePath, { basedir: templateDir });
    return compiled(data);
  } catch (err) {
    logger.error('Template Render Failed', {
      template: templateName,
      error: err.message,
    });
    throw err;
  }
}

export async function sendEmail({ to, subject, html, text, replyTo, priority }) {
  if (!transporter) {
    await createTransporter();
  }

  const mailOptions = {
    from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
    to,
    subject,
    priority: priority || 'normal',
    headers: {
      'List-Unsubscribe': `<mailto:${emailConfig.fromEmail}?subject=unsubscribe>`,
      'X-Priority': priority === 'high' ? '1' : '3',
    },
  };

  if (html) mailOptions.html = html;
  if (text) mailOptions.text = text;

  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email Sent', {
      to,
      subject,
      messageId: info.messageId,
      response: info.response,
    });
    return info;
  } catch (err) {
    logger.error('Email Send Failed', {
      to,
      subject,
      error: err.message,
      code: err.code,
      command: err.command,
    });
    throw err;
  }
}

export { transporter };
