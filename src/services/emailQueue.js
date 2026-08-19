import Bull from 'bull';
import emailConfig from '../config/email.config.js';
import logger from '../utils/logger.js';
import withTimeout from '../utils/withTimeout.js';
import { sendEmail, renderTemplate } from './emailService.js';

const REDIS_TIMEOUT_MS = parseInt(process.env.REDIS_HEALTH_CHECK_TIMEOUT_MS, 10) || 2000;

const emailQueue = new Bull('kraft-email-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    connectTimeout: 5000,
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
  },
  defaultJobOptions: {
    attempts: parseInt(process.env.MAX_RETRIES, 10) || 3,
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.RETRY_DELAY_MS, 10) || 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

emailQueue.on('completed', (job) => {
  logger.info('Email Job Completed', {
    jobId: job.id,
    type: job.data.type,
    to: job.data.to,
    enquiryId: job.data.enquiryId,
  });
});

emailQueue.on('failed', (job, err) => {
  logger.error('Email Job Failed', {
    jobId: job.id,
    type: job.data.type,
    to: job.data.to,
    enquiryId: job.data.enquiryId,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    error: err.message,
  });
});

emailQueue.on('stalled', (job) => {
  logger.warn('Email Job Stalled', {
    jobId: job.id,
    type: job.data.type,
    enquiryId: job.data.enquiryId,
  });
});

emailQueue.on('error', (err) => {
  logger.error('Bull Queue Error', { error: err.message });
});

emailQueue.process('customer-confirmation', async (job) => {
  const { to, subject, html, replyTo, priority } = job.data;
  logger.info('Processing customer-confirmation job', { jobId: job.id, enquiryId: job.data.enquiryId });
  await sendEmail({ to, subject, html, replyTo, priority });
});

emailQueue.process('admin-notification', async (job) => {
  const { to, subject, html, replyTo, priority } = job.data;
  logger.info('Processing admin-notification job', { jobId: job.id, enquiryId: job.data.enquiryId });
  await sendEmail({ to, subject, html, replyTo, priority });
});

export async function processEnquiryEmails(enquiry) {
  const customerSubject = `Enquiry Confirmation #${enquiry.id} - Kraft Your Trip`;
  const adminSubject = `[NEW ENQUIRY] ${enquiry.destination} - ${enquiry.name}`;

  const customerHtml = renderTemplate('enquiryConfirmation', {
    enquiry,
    appUrl: emailConfig.appUrl,
    year: new Date().getFullYear(),
  });

  await emailQueue.add('customer-confirmation', {
    type: 'customer-confirmation',
    to: enquiry.email,
    subject: customerSubject,
    html: customerHtml,
    enquiryId: enquiry.id,
  }, {
    priority: 2,
  });

  const adminHtml = renderTemplate('enquiryNotification', {
    enquiry,
    appUrl: emailConfig.appUrl,
    adminUrl: emailConfig.adminUrl,
    year: new Date().getFullYear(),
  });

  await emailQueue.add('admin-notification', {
    type: 'admin-notification',
    to: emailConfig.adminEmail,
    subject: adminSubject,
    html: adminHtml,
    replyTo: enquiry.email,
    priority: 'high',
    enquiryId: enquiry.id,
  }, {
    priority: 1,
  });

  logger.info('Enquiry Emails Queued', {
    enquiryId: enquiry.id,
    customerEmail: enquiry.email,
    adminEmail: emailConfig.adminEmail,
  });
}

export async function getQueueStats() {
  try {
    const [completed, failed, pending, active] = await Promise.all([
      withTimeout(emailQueue.getCompletedCount(), REDIS_TIMEOUT_MS, 'Redis: getCompletedCount'),
      withTimeout(emailQueue.getFailedCount(), REDIS_TIMEOUT_MS, 'Redis: getFailedCount'),
      withTimeout(emailQueue.getWaitingCount(), REDIS_TIMEOUT_MS, 'Redis: getWaitingCount'),
      withTimeout(emailQueue.getActiveCount(), REDIS_TIMEOUT_MS, 'Redis: getActiveCount'),
    ]);
    return { completed, failed, pending, active, redis: 'connected' };
  } catch (err) {
    logger.warn('Queue stats unavailable', { error: err.message });
    return {
      completed: 0,
      failed: 0,
      pending: 0,
      active: 0,
      redis: 'unavailable',
      error: err.message,
    };
  }
}

export async function closeQueue() {
  await emailQueue.close();
}

export { emailQueue };
