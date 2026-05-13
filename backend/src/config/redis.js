const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// BullMQ requires these two flags on the underlying ioredis connection,
// otherwise long-poll blocking commands surface as MaxRetriesPerRequestError.
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => {
  console.error('[redis]', err.message);
});

connection.on('connect', () => {
  console.log(`[redis] connected ${redisUrl}`);
});

module.exports = { connection, redisUrl };
