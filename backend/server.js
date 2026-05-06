require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

// ── Allowed origins (mirrors app.js CORS config) ──────────────────────────────
const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : defaultCorsOrigins;

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
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
  // Join the user's private room so events are routed only to them
  socket.join(socket.userId);
  console.log(`Socket connected: user ${socket.userId}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: user ${socket.userId}`);
  });
});

// Make io available to Express controllers via req.app.get('io')
app.set('io', io);

// ── DB + startup ──────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('DB connected');

    try {
      const { ensureBucketExists } = require('./src/services/storage.service');
      const { VIDEOS_BUCKET, AVATARS_BUCKET } = require('./src/config/s3');
      await ensureBucketExists(VIDEOS_BUCKET);
      await ensureBucketExists(AVATARS_BUCKET);
      console.log('Storage buckets ready');
    } catch (s3Err) {
      console.error('Storage initialization failed:', s3Err.message);
      process.exit(1);
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('DB connection error:', err);
  });