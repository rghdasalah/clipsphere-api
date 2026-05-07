require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// ── Allowed origins (mirrors app.js CORS config) ──────────────────────────
const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : defaultCorsOrigins;

// ── HTTP server ───────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// JWT auth middleware for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(socket.userId);
  console.log(`Socket connected: user ${socket.userId}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: user ${socket.userId}`);
  });
});

app.set('io', io);

// ── Fail-fast env checks ──────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set. Refusing to start.');
  process.exit(1);
}

// ── DB + startup ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000, // fail fast in dev instead of hanging
  })
  .then(async () => {
    console.log('DB connected');

    // Best-effort storage init. In dev, missing MinIO must NOT kill the API
    // — auth/feed/profile endpoints don't need it. Upload endpoints will
    // surface a clean error when actually called.
    try {
      const { ensureBucketExists } = require('./src/services/storage.service');
      const { VIDEOS_BUCKET, AVATARS_BUCKET } = require('./src/config/s3');
      await ensureBucketExists(VIDEOS_BUCKET);
      await ensureBucketExists(AVATARS_BUCKET);
      console.log('Storage buckets ready');
    } catch (s3Err) {
      const msg = `Storage initialization failed: ${s3Err.message}`;
      if (isDev) {
        console.warn(`[warn] ${msg}`);
        console.warn(
          '[warn] Continuing without MinIO. Upload endpoints will return errors until MinIO is running.'
        );
      } else {
        console.error(msg);
        process.exit(1);
      }
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connection error:', err.message);
    process.exit(1);
  });