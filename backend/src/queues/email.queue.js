const { Queue } = require('bullmq');
const { connection } = require('../config/redis');

const QUEUE_NAME = 'email';

const emailQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
});

exports.QUEUE_NAME = QUEUE_NAME;
exports.emailQueue = emailQueue;

exports.enqueueWelcomeEmail = (user) =>
  emailQueue.add('welcome', {
    userId: String(user._id),
    email: user.email,
    username: user.username,
  });

exports.enqueueEngagementEmail = (recipient, actorId, type, meta) =>
  emailQueue.add('engagement', {
    recipient: {
      _id: String(recipient._id),
      email: recipient.email,
      username: recipient.username,
    },
    actorId: String(actorId),
    type,
    meta: meta || {},
  });
