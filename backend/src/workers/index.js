require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  console.error('[worker] FATAL: MONGODB_URI is not set');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 })
  .then(() => console.log('[worker] mongo connected'))
  .catch((err) => {
    console.error('[worker] mongo connection error:', err.message);
    process.exit(1);
  });

const emailWorker = require('./email.worker');
const videoWorker = require('./video.worker');

[emailWorker, videoWorker].forEach((w) => {
  w.on('completed', (job) => {
    console.log(`[worker:${w.name}] job ${job.id} (${job.name}) completed`);
  });
  w.on('failed', (job, err) => {
    console.error(
      `[worker:${w.name}] job ${job?.id} (${job?.name}) failed:`,
      err.message
    );
  });
});

// Tiny health endpoint so Docker healthchecks work.
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT || 9100);
http
  .createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  })
  .listen(HEALTH_PORT, () => {
    console.log(`[worker] health server on :${HEALTH_PORT}`);
  });

const shutdown = async (signal) => {
  console.log(`[worker] ${signal} received, shutting down`);
  await Promise.allSettled([emailWorker.close(), videoWorker.close()]);
  await mongoose.disconnect();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
