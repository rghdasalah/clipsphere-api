const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const User = require('../models/User');
const emailService = require('../services/email.service');

const worker = new Worker(
  'email',
  async (job) => {
    if (job.name === 'welcome') {
      const user = await User.findById(job.data.userId);
      if (!user) {
        console.warn(`[email.worker] user ${job.data.userId} not found, skipping welcome`);
        return;
      }
      await emailService._sendWelcomeNow(user);
    } else if (job.name === 'engagement') {
      await emailService._sendEngagementNow(
        job.data.recipient,
        job.data.actorId,
        job.data.type,
        job.data.meta
      );
    } else {
      console.warn(`[email.worker] unknown job name: ${job.name}`);
    }
  },
  { connection, concurrency: 5 }
);

module.exports = worker;
