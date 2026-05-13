const { Queue } = require('bullmq');
const { connection } = require('../config/redis');

const QUEUE_NAME = 'video';

const videoQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
});

exports.QUEUE_NAME = QUEUE_NAME;
exports.videoQueue = videoQueue;

exports.enqueueVideoProbe = (videoId, bucket, key) =>
  videoQueue.add('probe', {
    videoId: String(videoId),
    bucket,
    key,
  });
